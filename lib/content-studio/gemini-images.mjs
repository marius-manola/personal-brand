// Gemini image agent — drives a logged-in gemini.google.com session in a real
// Brave/Chrome window. No Gemini API key. One persistent profile under
// .content-studio/gemini-profile. Sign in once; cookies stay. Images reuse the
// same chat for up to 10 jobs, then rotate.
//
// Gemini's DOM is not a stable public API, so every selector below is overridable
// from config.json → gemini.selectors, and generation diffs the set of <img> URLs
// before/after the prompt to find the freshly generated image. If Google restyles
// the page, tweak the selectors in config; the machinery stays the same.
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
const ROOT = process.cwd();
const PROFILE_DIR = path.join(ROOT, ".content-studio", "gemini-profile");
const DEBUG_DIR = path.join(ROOT, ".content-studio", "gemini-debug");
const APP_URL = "https://gemini.google.com/app";

// Which Chromium browser to drive. executablePath wins (e.g. Brave); otherwise a
// Playwright channel like "chrome". Overridable in config.json → gemini.
const DEFAULT_ENGINE = {
  executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  channel: null,
};

// Defaults — overridable via config.json → { "gemini": { "selectors": {...} } }.
const DEFAULTS = {
  composer: [
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    "textarea",
  ],
  send: [
    'button[aria-label*="Send" i]',
    'button[aria-label*="Trimite" i]',
    'button.send-button',
    'button[mattooltip*="Send" i]',
    'button[mattooltip*="Trimite" i]',
  ],
  // an <img> is "generated" if its src matches this and it renders large
  imageSrc: "googleusercontent\\.com|blob:|\\.googleapis\\.com",
  signedOutHint: "accounts.google.com",
  // text prefix that biases Gemini toward returning an image
  promptPrefix: "Create image: ",
  minImagePx: 256,
  // How many images to generate in ONE chat before rotating to a fresh one.
  // Images used to get a brand-new chat each — dozens of near-identical
  // one-message chats per day is exactly the pattern that flags the account
  // as dubious. Reusing a chat keeps the account looking human; the cap just
  // stops the DOM from growing unbounded.
  maxChatJobs: 10,
  // Max wait for the web-reference turn to finish streaming. The reply itself
  // is done in ~10-20s; the done-detector sometimes never fires on Gemini's DOM
  // (page text keeps mutating), and with the old 75s budget that burned a flat
  // 75s on EVERY image (joblog: 86-88s/image vs ~15s without the turn).
  referenceWaitMs: 25000,
  // Write .gemini-debug/after-submit.{png,json} on every generation. The
  // full-page screenshot costs ~1-2s per image, so it's opt-in; error/timeout
  // dumps still always happen.
  debug: false,
};

let pw = null; // lazily-required playwright-core
let ctx = null; // persistent browser context
let page = null; // the single Gemini tab
let pageCrashed = false; // renderer died ("Aw, Snap") — page object lives on but is unusable
let lastError = null;
// The ongoing image chat. Once a generation lands, its conversation URL is
// remembered and every following job navigates BACK to it instead of opening a
// new chat — survives browser restarts and interleaved geminiAsk() calls.
let imageChatUrl = null;
let imageChatJobs = 0; // generations landed in the current chat (rotation counter)

// Serialize everything: one Chrome tab, one request at a time.
let chain = Promise.resolve();
function serialize(fn) {
  const run = chain.then(fn, fn);
  // keep the chain alive even if this job throws
  chain = run.then(() => {}, () => {});
  return run;
}

function cfg(gemini = {}) {
  const sel = { ...DEFAULTS, ...(gemini || {}) };
  sel.selectors = { ...DEFAULTS, ...(gemini.selectors || {}) };
  sel.engine = { ...DEFAULT_ENGINE, ...(gemini.engine || {}) };
  return sel;
}

function launchOptions(sel) {
  const opts = {
    headless: false,
    viewport: { width: 1280, height: 900 },
    // Strip Playwright's automation fingerprint so Google's "this browser may not
    // be secure" bot-block doesn't fire on the sign-in flow.
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-blink-features=AutomationControlled",
    ],
  };
  const eng = sel.engine || DEFAULT_ENGINE;
  // Prefer an explicit executable (Brave) if it exists; else fall back to a channel.
  if (eng.executablePath && fs.existsSync(eng.executablePath)) opts.executablePath = eng.executablePath;
  else opts.channel = eng.channel || "chrome";
  return opts;
}

async function loadPlaywright() {
  if (pw) return pw;
  try {
    pw = await import("playwright-core");
    return pw;
  } catch (e) {
    throw new Error(
      "playwright-core is not installed. Run `npm install` in the studio/ folder."
    );
  }
}

function contextAlive() {
  return !!(ctx && page && !page.isClosed() && !pageCrashed);
}

// Adopt a tab as THE Gemini page and watch for renderer crashes. A crashed tab
// is not "closed" (page.isClosed() stays false), so without this flag every
// later goto fails with "Page crashed" while ensureContext still thinks the
// context is healthy — the exact wedge that made "Connect Gemini" a no-op.
function adoptPage(p) {
  page = p;
  pageCrashed = false;
  page.setDefaultTimeout(45000);
  page.on("crash", () => {
    pageCrashed = true;
  });
}

// Kill any browser process still holding our dedicated profile. Matches on the
// --user-data-dir=<PROFILE_DIR> command line, so ONLY the studio's automation
// browser is affected — the user's everyday Brave uses a different profile dir.
// This happens when the studio server restarts/crashes: the spawned Brave
// outlives it, keeps the profile locked, and every subsequent launch fails with
// "profile is already in use" (and pokes the orphan into opening extra tabs).
function killOrphanBrowser() {
  return new Promise((resolve) => {
    execFile("pkill", ["-f", `--user-data-dir=${PROFILE_DIR}`], () => {
      // stale singleton lock files can survive a kill/crash; clear them too
      for (const f of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
        try { fs.rmSync(path.join(PROFILE_DIR, f), { force: true }); } catch { /* best effort */ }
      }
      setTimeout(resolve, 1500); // give the process time to fully exit
    });
  });
}

async function ensureContext(sel) {
  if (contextAlive()) return;
  // The browser may still be healthy with only the tab dead (crash or manual
  // close) — replace just the page before resorting to a full relaunch.
  if (ctx) {
    try {
      if (page && pageCrashed) await page.close().catch(() => {});
      adoptPage(await ctx.newPage());
      return;
    } catch {
      try { await ctx.close(); } catch { /* already gone */ }
      ctx = null;
      page = null;
    }
  }
  const { chromium } = await loadPlaywright();
  const opts = launchOptions(sel || cfg());
  try {
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, opts);
  } catch (e) {
    if (!/already in use|existing browser session/i.test(String(e.message || e))) throw e;
    await killOrphanBrowser();
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, opts);
  }
  // Remove the last obvious automation tell before any page script runs.
  await ctx
    .addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    })
    .catch(() => {});
  ctx.on("close", () => {
    ctx = null;
    page = null;
  });
  adoptPage(ctx.pages()[0] || (await ctx.newPage()));
}

async function firstVisible(p, selectors, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const s of selectors) {
      const loc = p.locator(s).first();
      try {
        if (await loc.isVisible()) return loc;
      } catch {
        /* selector may be momentarily detached */
      }
    }
    await p.waitForTimeout(250);
  }
  return null;
}

let signedInConfirmed = false; // seen a real avatar this browser session

async function isSignedIn(p, sel) {
  if (new RegExp(sel.signedOutHint).test(p.url())) {
    signedInConfirmed = false;
    return false;
  }
  // Gemini shows the message box even when logged out, so composer-presence is NOT
  // proof of sign-in. The reliable tells: a real account avatar
  // (lh3.googleusercontent.com/a/ACg…, vs logged-out /a/default-user) means signed
  // IN; a visible "Sign in" button means signed OUT. After a fresh navigation the
  // avatar loads a beat late, so poll until one of those signals is definitive.
  // Once this session has confirmed sign-in, later checks use a short deadline —
  // the ambiguous-page worst case otherwise costs the full poll on every image.
  const deadline = Date.now() + (signedInConfirmed ? 3000 : 9000);
  while (Date.now() < deadline) {
    let s;
    try {
      s = await p.evaluate(() => {
        const imgs = [...document.images].map((im) => im.currentSrc || im.src || "");
        return {
          realAvatar: imgs.some((u) => /googleusercontent\.com\/a\//.test(u) && !/default-user/.test(u)),
          signIn: [...document.querySelectorAll("a, button")].some((e) => /^\s*sign ?in\s*$/i.test((e.textContent || "").trim())),
        };
      });
    } catch {
      return false;
    }
    if (s.realAvatar) {
      signedInConfirmed = true;
      return true;
    }
    if (s.signIn) {
      signedInConfirmed = false;
      return false;
    }
    await p.waitForTimeout(400);
  }
  // Settled with neither a clear avatar nor a Sign-in button: logged-out pages
  // reliably show "Sign in", so ambiguity here means signed in.
  return true;
}

// Phrases Gemini uses when it won't/can't make the image. Real-world denials
// title the chat "Image Generation Request Denied", so "denied"/"declined" must
// match — otherwise the job silently burns its whole timeout budget.
const REFUSAL_RE =
  /can'?t (create|generate|make|help with)|cannot (create|generate|help with)|unable to (create|generate|make)|not able to (create|generate)|wasn'?t able to (create|generate|make)|couldn'?t (create|generate|make)|failed to (create|generate|make)|request denied|generation request denied|declined? (this|that|your|the) request|violates? (our|the) polic|isn'?t available|not available in your (location|country|region)|you'?re signed out|sign in to/i;

// Phrases that mean the ACCOUNT'S USAGE LIMIT is exhausted (not a content
// refusal). These abort the whole queue upstream — retrying other prompts just
// burns time until the quota resets. Thrown with the GEMINI_USAGE_LIMIT prefix
// so the server can tell the two apart.
export const LIMIT_RE =
  /reached your( daily| current)? (usage |generation |image[ -]generation )?limit|you'?ve reached (the|your) limit|usage limit|out of (image )?generations|no (more )?(image )?generations (left|remaining)|limit (will )?reset|quota (has been |was )?(reached|exceeded)|try again (later|tomorrow|in \d)|come back (later|tomorrow)|upgrade to .{0,40}(continue|more|higher limits)|can'?t (create|generate|make)( any)? more images/i;
export const isLimitError = (e) => /^GEMINI_USAGE_LIMIT:/.test(String((e && e.message) || e || ""));

// Content refusal ("can't generate that image"). Like a quota claim, these are
// often bluffs — the server escalates both through the same ladder: push back
// in-chat → fresh chat → simpler prompt → long timeout.
export const isRefusalError = (e) => /^Gemini declined:/.test(String((e && e.message) || e || ""));

// Errors that mean the BROWSER/SESSION is broken, not the prompt: a fresh
// browser (and a minute of cooldown) can fix these, so the queue should
// restart and retry rather than fail the job — retrying the same prompt into
// a crashed tab just fails again instantly. Matches every wedge seen in the
// joblog: renderer crashes, the profile-lock storm, a vanished composer, a
// dropped Google session, and the hard watchdog.
export const isInfraError = (e) =>
  /crashed|target closed|browser has been closed|page has been closed|context or browser|profile is already in use|existing browser session|message box|not signed in|watchdog|net::ERR|navigation failed|frame was detached/i.test(
    String((e && e.message) || e || "")
  );
async function responseRefusal(p, afterMarker = null) {
  try {
    const full = await p.evaluate(() => {
      // Scope to the conversation pane. body.innerText includes the sidebar,
      // whose titles of PREVIOUS failed chats ("Image Creation Request Denied")
      // otherwise read as a refusal of the CURRENT prompt while its image is
      // still rendering — a phantom denial.
      const scope = document.querySelector('chat-window, [role="main"], main') || document.body;
      return scope.innerText || "";
    });
    // Bluff-retry turns happen in the SAME chat as the quota warning they're
    // contesting — only text after our own pushback message counts, or the
    // stale warning above it instantly re-matches as a phantom next strike.
    let txt = full.slice(-1200);
    if (afterMarker) {
      const marker = afterMarker.slice(0, 40);
      const idx = full.lastIndexOf(marker);
      if (idx < 0) return null; // pushback not rendered yet — nothing new to judge
      txt = full.slice(idx + marker.length);
    }
    // Only sentence-like lines count. Bare UI labels leak into innerText when a
    // menu is open — the settings menu's "Usage limits" item once matched
    // LIMIT_RE and drained the whole queue as a phantom quota hit.
    const lines = txt.split("\n").map((l) => l.trim()).filter((l) => l.length >= 15);
    // Limit phrases first — a quota message must not be mistaken for a content refusal.
    for (const rx of [LIMIT_RE, REFUSAL_RE]) {
      const hit = lines.find((l) => rx.test(l));
      if (hit) return hit;
    }
    return null;
  } catch {
    return null;
  }
}

// Type a message into the composer and submit it.
async function sendMessage(p, sel, text) {
  // Close any stray menu/overlay first — an open menu swallows clicks and
  // Enter, so the prompt piles up in the composer instead of submitting.
  await p.keyboard.press("Escape").catch(() => {});
  const composer = p.locator(sel.selectors.composer.join(", ")).first();
  try {
    await composer.waitFor({ state: "visible", timeout: 20000 });
  } catch {
    await dumpDebug(p, sel, "no-composer");
    throw new Error(
      "could not find Gemini's message box (see .content-studio/gemini-debug)"
    );
  }
  await composer.click();
  // Clear leftovers from a previously swallowed submit so prompts never concatenate.
  await p.keyboard.press("Meta+a").catch(() => {});
  await p.keyboard.press("Backspace").catch(() => {});
  await p.keyboard.insertText(text);
  await p.waitForTimeout(300);
  // Submitting is flaky: the send button can be clicked while still disabled
  // (a silent no-op), an overlay can swallow the click, and Enter can land as
  // a newline. Keep trying until the composer actually empties — and fail
  // FAST if it never does, instead of burning the whole image-poll budget on
  // a message that was never sent (timeout.png showed exactly that: prompt
  // still in the box, chat empty, 75s wasted).
  const composerEmpty = async () => {
    await p.waitForTimeout(900);
    return (await composer.innerText().catch(() => "")).trim().length <= 10;
  };
  for (let round = 0; round < 4; round++) {
    const sendBtn = await firstVisible(p, sel.selectors.send, round ? 800 : 3000);
    if (sendBtn) await sendBtn.click().catch(() => {});
    if (await composerEmpty()) return;
    await composer.press("Enter").catch(() => {});
    if (await composerEmpty()) return;
    // A "Something went wrong (NNNN)" toast means Gemini's backend REJECTED the
    // send (seen when messages go out too fast) — no amount of re-clicking
    // helps, so surface the real reason instead of "swallowed".
    const toast = await p
      .evaluate(() => ((document.body.innerText || "").match(/something went wrong[^\n]*/i) || [null])[0])
      .catch(() => null);
    if (toast) {
      await dumpDebug(p, sel, "no-send");
      throw new Error(`Gemini rejected the send: "${toast.trim()}" — likely message rate-limit, will retry after cooldown`);
    }
    await p.keyboard.press("Escape").catch(() => {});
    await composer.click().catch(() => {});
  }
  await dumpDebug(p, sel, "no-send");
  throw new Error("Gemini did not accept the prompt — send click/Enter swallowed repeatedly (see .content-studio/gemini-debug/no-send.png)");
}

// Wait until Gemini finishes streaming its current response: no visible Stop
// control and the page text has stopped growing for a couple of checks. The
// 3s floor keeps a check pair that lands BEFORE the response starts streaming
// from being mistaken for "done".
async function waitForResponseDone(p, maxMs = 25000) {
  const start = Date.now();
  const deadline = start + maxMs;
  let lastLen = -1;
  let stable = 0;
  while (Date.now() < deadline) {
    let s;
    try {
      s = await p.evaluate(() => ({
        streaming: !!document.querySelector(
          'button[aria-label*="Stop" i], button[aria-label*="Oprește" i], button[aria-label*="Opreste" i], mat-icon[data-mat-icon-name="stop"], .stop-icon'
        ),
        len: (document.body.innerText || "").length,
      }));
    } catch {
      s = { streaming: false, len: lastLen };
    }
    if (!s.streaming && s.len === lastLen) {
      if (++stable >= 2 && Date.now() - start >= 3000) return true;
    } else {
      stable = 0;
    }
    lastLen = s.len;
    await p.waitForTimeout(800);
  }
  return false;
}

// Snapshot current large image srcs so we can detect the new one after submit.
async function imageSrcSet(p, sel) {
  const re = sel.imageSrc;
  return new Set(
    await p.evaluate(
      ({ re, minPx }) => {
        const rx = new RegExp(re);
        return [...document.images]
          .filter((im) => rx.test(im.currentSrc || im.src || ""))
          .filter((im) => (im.naturalWidth || im.width) >= minPx)
          .map((im) => im.currentSrc || im.src);
      },
      { re, minPx: sel.minImagePx }
    )
  );
}

// Fresh large images with their natural dimensions (so we can pick the biggest).
async function largeImages(p, sel) {
  return await p.evaluate(
    ({ re, minPx }) => {
      const rx = new RegExp(re);
      return [...document.images]
        .map((im) => ({ src: im.currentSrc || im.src || "", w: im.naturalWidth || im.width, h: im.naturalHeight || im.height }))
        .filter((o) => rx.test(o.src) && o.w >= minPx);
    },
    { re: sel.imageSrc, minPx: sel.minImagePx }
  );
}

// Get the generated image's bytes. Tries clean full-res methods first; only
// screenshots (which can catch overlay UI) as a last resort. Records what worked
// to studio/.gemini-debug/download.json.
async function downloadImage(p, sel, src) {
  const diag = { src: src.slice(0, 140), methods: {} };
  const finish = (out) => {
    try {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
      fs.writeFileSync(path.join(DEBUG_DIR, "download.json"), JSON.stringify({ ...diag, chosen: out.via, mime: out.mime, bytes: out.buffer.length }, null, 2));
    } catch { /* best effort */ }
    return { mime: out.mime, buffer: out.buffer };
  };

  // 0. canvas export — the img is already decoded in the page, so draw it to a
  // canvas at natural resolution and read PNG bytes. Works for blob: URLs (Gemini's
  // case) and any non-CORS-tainted image; full res, no overlay UI. Best method.
  // MUST target the freshly-generated `src`: jobs share ONE persistent chat, so
  // every earlier job's image is still in the DOM. Grabbing the globally-largest
  // image instead returned a STALE earlier generation over and over, saving the
  // same bytes under many filenames.
  try {
    const r = await canvasExtract(p, sel, src);
    if (r) {
      diag.methods.canvas = { ok: true, bytes: r.buffer.length, w: r.w, h: r.h };
      return finish({ ...r, via: "canvas" });
    }
    diag.methods.canvas = { ok: false };
  } catch (e) {
    diag.methods.canvas = { err: String(e.message || e) };
  }

  // 1. browser request context — no CORS, shares cookies, full resolution
  try {
    const resp = await p.request.get(src, { headers: { referer: "https://gemini.google.com/", "user-agent": await p.evaluate(() => navigator.userAgent) } });
    diag.methods.request = { ok: resp.ok(), status: resp.status(), ct: resp.headers()["content-type"] };
    if (resp.ok()) {
      const buffer = await resp.body();
      if (buffer && buffer.length > 1000) return finish({ mime: (resp.headers()["content-type"] || "image/png").split(";")[0], buffer, via: "request.get" });
    }
  } catch (e) {
    diag.methods.request = { err: String(e.message || e) };
  }

  // 2. in-page fetch (works for same-origin / permissive CORS)
  try {
    const r = await pageFetchDataUrl(p, src);
    diag.methods.pageFetch = { ok: true, bytes: r.buffer.length };
    if (r.buffer.length > 1000) return finish({ ...r, via: "pageFetch" });
  } catch (e) {
    diag.methods.pageFetch = { err: String(e.message || e) };
  }

  // 3. last resort: screenshot the image element with overlay controls hidden
  diag.methods.screenshot = true;
  const r = await screenshotGeneratedImage(p, sel, src);
  return finish({ ...r, via: "screenshot" });
}

// Draw the freshly-generated image (matched by `src`) onto a canvas and export PNG
// bytes at its natural resolution. Returns null if that exact image isn't found or
// the canvas is CORS-tainted (toDataURL throws) — deliberately NOT falling back to
// the largest image, because in the shared persistent chat that would grab a stale
// earlier generation. A null here cascades to request.get / pageFetch, which both
// fetch the exact `src` too. Only when no src is given (never in practice) does it
// fall back to the largest loaded image.
async function canvasExtract(p, sel, src = null) {
  const out = await p.evaluate(({ minPx, src }) => {
    let img = src
      ? [...document.images].find((im) => (im.currentSrc || im.src || "") === src)
      : null;
    if (!img && !src) {
      const imgs = [...document.images].filter((im) => (im.naturalWidth || im.width) >= minPx);
      imgs.sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight);
      img = imgs[0];
    }
    if (!img || (img.naturalWidth || img.width) < minPx) return null;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    try {
      c.getContext("2d").drawImage(img, 0, 0);
      return { dataUrl: c.toDataURL("image/png"), w: c.width, h: c.height };
    } catch (e) {
      return { err: String(e.message || e) };
    }
  }, { minPx: sel.minImagePx, src: src || null });
  if (!out || out.err || !out.dataUrl) return null;
  const m = /^data:([^;]+);base64,(.*)$/.exec(out.dataUrl);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], "base64"), w: out.w, h: out.h };
}

async function pageFetchDataUrl(p, src) {
  const dataUrl = await p.evaluate(async (u) => {
    const r = await fetch(u);
    const b = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(b);
    });
  }, src);
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if (!m) throw new Error("could not read image bytes in page");
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

async function fetchImageBytes(p, src) {
  // blob: URLs only resolve inside the page (same-origin, no CORS issue there).
  if (/^blob:/.test(src)) {
    const dataUrl = await p.evaluate(async (u) => {
      const r = await fetch(u);
      const b = await r.blob();
      return await new Promise((res) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.readAsDataURL(b);
      });
    }, src);
    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
    if (!m) throw new Error("could not read blob image bytes");
    return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
  }
  // http(s): fetch through the browser's request context — NOT subject to page CORS
  // and it shares the session cookies, so googleusercontent images come back clean.
  const resp = await p.request.get(src);
  if (!resp.ok()) throw new Error(`image fetch failed (${resp.status()})`);
  const buffer = await resp.body();
  const mime = (resp.headers()["content-type"] || "image/png").split(";")[0];
  return { mime, buffer };
}

// Fallback: screenshot the freshly-generated image element (matched by `src`, so
// the shared persistent chat's earlier images can't be captured instead). Hides any
// interactive overlay (Gemini's share/copy/download buttons) that sits on top of it
// first, so those controls don't get baked into the saved picture.
async function screenshotGeneratedImage(p, sel, src = null) {
  const handle = await p.evaluateHandle(({ minPx, src }) => {
    let img = src
      ? [...document.images].find((im) => (im.currentSrc || im.src || "") === src)
      : null;
    if (!img) {
      const imgs = [...document.images].filter((im) => (im.naturalWidth || im.width) >= minPx);
      imgs.sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight);
      img = imgs[0];
    }
    if (!img) return null;
    const r = img.getBoundingClientRect();
    const overlaps = (el) => {
      const b = el.getBoundingClientRect();
      return !(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom);
    };
    const hidden = [];
    document.querySelectorAll('button, [role="button"], a, mat-icon, .buttons-container, [data-test-id]').forEach((el) => {
      if (el.contains(img) || img.contains(el)) return;
      if (el.offsetParent !== null && overlaps(el)) {
        hidden.push([el, el.style.visibility]);
        el.style.visibility = "hidden";
      }
    });
    window.__gemHidden = hidden;
    return img;
  }, { minPx: sel.minImagePx, src: src || null });
  const elt = handle.asElement();
  if (!elt) throw new Error("no image element to screenshot");
  const buffer = await elt.screenshot();
  await p.evaluate(() => {
    (window.__gemHidden || []).forEach(([el, v]) => (el.style.visibility = v || ""));
    window.__gemHidden = null;
  }).catch(() => {});
  return { mime: "image/png", buffer };
}

// Save a screenshot + page diagnostics so a headless failure can be inspected.
async function dumpDebug(p, sel, label = "debug") {
  try {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
    const shot = path.join(DEBUG_DIR, `${label}.png`);
    await p.screenshot({ path: shot, fullPage: true }).catch(() => {});
    const info = await p.evaluate(
      ({ re, minPx, comp, send }) => {
        const rx = new RegExp(re);
        const q = (list) => list.map((s) => ({ sel: s, count: document.querySelectorAll(s).length, visible: !!document.querySelector(s) }));
        return {
          url: location.href,
          title: document.title,
          composerSelectors: q(comp),
          sendSelectors: q(send),
          allImages: [...document.images].map((im) => ({
            src: (im.currentSrc || im.src || "").slice(0, 120),
            w: im.naturalWidth || im.width,
            h: im.naturalHeight || im.height,
            matches: rx.test(im.currentSrc || im.src || ""),
            big: (im.naturalWidth || im.width) >= minPx,
          })),
          bodyText: (document.body.innerText || "").slice(0, 1500),
        };
      },
      { re: sel.imageSrc, minPx: sel.minImagePx, comp: sel.selectors.composer, send: sel.selectors.send }
    );
    fs.writeFileSync(path.join(DEBUG_DIR, `${label}.json`), JSON.stringify(info, null, 2));
    return { shot, info };
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

export function geminiDebug(gemini) {
  const sel = cfg(gemini);
  return serialize(async () => {
    if (!contextAlive()) return { error: "browser not open" };
    return await dumpDebug(page, sel, "ondemand");
  });
}

// ---- public API -----------------------------------------------------------

export async function geminiStatus(gemini) {
  const sel = cfg(gemini);
  const out = { installed: true, browserOpen: contextAlive(), signedIn: false, lastError };
  try {
    await loadPlaywright();
  } catch (e) {
    return { installed: false, browserOpen: false, signedIn: false, lastError: e.message };
  }
  if (contextAlive()) {
    try {
      out.signedIn = await isSignedIn(page, sel);
    } catch {
      /* leave false */
    }
  }
  return out;
}

// Open the browser to Gemini so the user can log into Google once.
export async function geminiConnect(gemini) {
  const sel = cfg(gemini);
  return serialize(async () => {
    await ensureContext(sel);
    if (!/gemini\.google\.com/.test(page.url())) {
      await page.goto(APP_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
    }
    await page.bringToFront().catch(() => {});
    const signedIn = await isSignedIn(page, sel).catch(() => false);
    return { browserOpen: true, signedIn };
  });
}

// Generate one image from a text prompt. Resolves to { mime, buffer }.
// When referencePrompt is given, the job runs as TWO chat turns: first ask Gemini
// to pull up real web reference photos (explicitly NOT generating yet), then —
// once that response finishes — ask it to generate. The old single mega-prompt
// ("search the web, then create ONE image") regularly came back
// "Image Generation Request Denied"; the split flow avoids that.
//
// Jobs run in ONE persistent chat: the first generation's conversation URL is
// remembered and later jobs navigate back to it (rotating to a fresh chat only
// every maxChatJobs images, or when newChat:true forces one). Spawning a new
// chat per image was flagging the account as dubious.
export function geminiGenerate({ prompt, referencePrompt = null, gemini, timeoutMs = 180000, bluffRetry = null, newChat = false }) {
  const sel = cfg(gemini);
  return serialize(async () => {
    lastError = null;
    try {
      await ensureContext(sel);
      // Bluff-retry: Gemini claimed quota/policy trouble in the CURRENT chat,
      // and the server decided to contest it. Stay exactly where we are and
      // push back — the image regularly arrives as the reply. If the chat was
      // lost meanwhile (browser restart), fall back to the normal flow.
      const inPlaceBluff = !!bluffRetry && /gemini\.google\.com/.test(page.url() || "");
      if (!inPlaceBluff) {
        if (newChat || imageChatJobs >= sel.maxChatJobs) {
          imageChatUrl = null;
          imageChatJobs = 0;
        }
        const here = (page.url() || "").split(/[?#]/)[0];
        if (imageChatUrl && here !== imageChatUrl) {
          // return to the ongoing image chat (works even after a browser restart)
          const ok = await page
            .goto(imageChatUrl, { waitUntil: "domcontentloaded" })
            .then(() => true, () => false);
          if (!ok) {
            imageChatUrl = null;
            imageChatJobs = 0;
          }
        }
        if (!imageChatUrl) await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
      }
      if (!(await isSignedIn(page, sel))) {
        throw new Error("not signed in to Google — click 'Connect Gemini' in the Images tab and log in to your Google account in that Chrome window, then retry");
      }

      if (referencePrompt && !inPlaceBluff) {
        await sendMessage(page, sel, referencePrompt);
        // A refusal on the reference turn is non-fatal — the generate turn still
        // stands on its own. Just wait for the turn to finish streaming.
        await waitForResponseDone(page, sel.referenceWaitMs);
      }

      // Snapshot AFTER the reference turn so web photos Gemini pulled up there
      // (or images from earlier jobs in this same chat) don't get mistaken for
      // the generated image.
      const before = await imageSrcSet(page, sel);

      const sentText = inPlaceBluff ? bluffRetry : referencePrompt ? prompt : sel.promptPrefix + prompt;
      await sendMessage(page, sel, sentText);
      await page.waitForTimeout(1000);
      if (sel.debug) await dumpDebug(page, sel, "after-submit");

      // poll for a brand-new large image; bail early if Gemini refuses
      const deadline = Date.now() + timeoutMs;
      let newSrc = null;
      let checks = 0;
      while (Date.now() < deadline) {
        const fresh = (await largeImages(page, sel)).filter((im) => !before.has(im.src));
        if (fresh.length) {
          // the biggest fresh image is the generated one (thumbnails in the rail are smaller)
          fresh.sort((a, b) => b.w * b.h - a.w * a.h);
          newSrc = fresh[0].src;
          break;
        }
        if (++checks % 5 === 0) {
          // Only text AFTER our own just-sent message counts — the persistent
          // chat holds every earlier turn, so an old refusal/limit message
          // above would otherwise re-match as a phantom denial of THIS prompt.
          const refusal = await responseRefusal(page, sentText);
          if (refusal) {
            if (LIMIT_RE.test(refusal)) throw new Error(`GEMINI_USAGE_LIMIT: ${refusal.slice(0, 300)}`);
            throw new Error(`Gemini declined: ${refusal.slice(0, 200)}`);
          }
        }
        await page.waitForTimeout(800);
      }
      if (!newSrc) {
        await dumpDebug(page, sel, "timeout");
        throw new Error(`Gemini did not return an image within ${Math.round(timeoutMs / 1000)}s`);
      }
      // The generation landed — adopt this conversation as THE image chat so
      // the next job continues here instead of spawning a new one.
      const chatUrl = (page.url() || "").split(/[?#]/)[0];
      if (/gemini\.google\.com\/app\/[\w-]/.test(chatUrl)) imageChatUrl = chatUrl;
      imageChatJobs++;
      // let the full-res version settle, then grab CLEAN bytes (URL fetch = full res,
      // no overlay UI); screenshot is only a last resort.
      await page.waitForTimeout(800);
      return await downloadImage(page, sel, newSrc);
    } catch (e) {
      lastError = String(e.message || e);
      // A "Page crashed" thrown from goto/evaluate doesn't always fire the
      // page 'crash' event first — mark the flag ourselves so the next
      // ensureContext replaces the tab instead of reusing the dead one
      // (this was the July-7 wedge: 26 jobs in a row failing on a crashed tab).
      if (/crashed|target closed|browser has been closed|page has been closed/i.test(lastError)) pageCrashed = true;
      if (contextAlive()) await dumpDebug(page, sel, "error").catch(() => {});
      throw e;
    }
  });
}

// Run a MULTI-TURN image sequence in one chat and return the FINAL image.
// Built for the Social Studio's two-step slides: turn 1 generates the clean
// background, turn 2 says "add this exact text on top of it". The whole
// sequence runs inside ONE serialize() block, so no other image job can land
// between the turns and the chat can never rotate mid-sequence — both would
// break "the image you just generated". Each turn must produce a fresh image.
// steps: array of prompt strings; promptPrefix is applied to the FIRST turn
// only (later turns are edit instructions, not fresh generations).
export function geminiGenerateSequence({ steps, gemini, timeoutMs = 180000, newChat = false }) {
  const sel = cfg(gemini);
  if (!Array.isArray(steps) || !steps.length) throw new Error("geminiGenerateSequence: steps required");
  return serialize(async () => {
    lastError = null;
    try {
      await ensureContext(sel);
      // Rotate BEFORE starting if the whole sequence wouldn't fit in the
      // current chat's job budget — never mid-sequence.
      if (newChat || imageChatJobs + steps.length > sel.maxChatJobs) {
        imageChatUrl = null;
        imageChatJobs = 0;
      }
      const here = (page.url() || "").split(/[?#]/)[0];
      if (imageChatUrl && here !== imageChatUrl) {
        const ok = await page.goto(imageChatUrl, { waitUntil: "domcontentloaded" }).then(() => true, () => false);
        if (!ok) {
          imageChatUrl = null;
          imageChatJobs = 0;
        }
      }
      if (!imageChatUrl) await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
      if (!(await isSignedIn(page, sel))) {
        throw new Error("not signed in to Google — click 'Connect Gemini' in the Images tab and log in to your Google account in that Chrome window, then retry");
      }

      let lastSrc = null;
      for (let i = 0; i < steps.length; i++) {
        const before = await imageSrcSet(page, sel);
        const sentText = i === 0 ? sel.promptPrefix + steps[i] : steps[i];
        await sendMessage(page, sel, sentText);
        await page.waitForTimeout(1000);

        const deadline = Date.now() + timeoutMs;
        let newSrc = null;
        let checks = 0;
        while (Date.now() < deadline) {
          const fresh = (await largeImages(page, sel)).filter((im) => !before.has(im.src));
          if (fresh.length) {
            fresh.sort((a, b) => b.w * b.h - a.w * a.h);
            newSrc = fresh[0].src;
            break;
          }
          if (++checks % 5 === 0) {
            const refusal = await responseRefusal(page, sentText);
            if (refusal) {
              if (LIMIT_RE.test(refusal)) throw new Error(`GEMINI_USAGE_LIMIT: ${refusal.slice(0, 300)}`);
              throw new Error(`Gemini declined: ${refusal.slice(0, 200)}`);
            }
          }
          await page.waitForTimeout(800);
        }
        if (!newSrc) {
          await dumpDebug(page, sel, "seq-timeout");
          throw new Error(`Gemini did not return an image for step ${i + 1}/${steps.length} within ${Math.round(timeoutMs / 1000)}s`);
        }
        const chatUrl = (page.url() || "").split(/[?#]/)[0];
        if (/gemini\.google\.com\/app\/[\w-]/.test(chatUrl)) imageChatUrl = chatUrl;
        imageChatJobs++;
        lastSrc = newSrc;
        await page.waitForTimeout(800);
      }
      return await downloadImage(page, sel, lastSrc);
    } catch (e) {
      lastError = String(e.message || e);
      if (/crashed|target closed|browser has been closed|page has been closed/i.test(lastError)) pageCrashed = true;
      if (contextAlive()) await dumpDebug(page, sel, "seq-error").catch(() => {});
      throw e;
    }
  });
}

// Ask Gemini a plain text question in a FRESH chat and return the response text.
// Used by the SEO Lab to test what Gemini answers for tracked buyer queries.
// Rides the same serialized chain as image jobs, so the two can never collide,
// and the same logged-in profile — this measures the real gemini.google.com
// product surface, not the API. The echoed prompt is stripped so the question
// itself never reads as Gemini "mentioning" a brand.
export function geminiAsk({ prompt, gemini, timeoutMs = 60000 }) {
  const sel = cfg(gemini);
  return serialize(async () => {
    lastError = null;
    try {
      await ensureContext(sel);
      await page.goto(APP_URL, { waitUntil: "domcontentloaded" }); // fresh chat every time
      if (!(await isSignedIn(page, sel))) {
        throw new Error("not signed in to Google — click 'Connect Gemini' in the Images tab and log in, then retry");
      }
      await sendMessage(page, sel, prompt);
      await waitForResponseDone(page, timeoutMs);
      let text = await page.evaluate(() => {
        const scope = document.querySelector('chat-window, [role="main"], main') || document.body;
        return scope.innerText || "";
      });
      const idx = text.indexOf(prompt.slice(0, 60));
      if (idx >= 0) text = text.slice(idx + prompt.length);
      if (text.replace(/\s+/g, " ").trim().length < 40) throw new Error("no answer captured from Gemini");
      return { text: text.slice(0, 15000) };
    } catch (e) {
      lastError = String(e.message || e);
      if (/crashed|target closed|browser has been closed|page has been closed/i.test(lastError)) pageCrashed = true;
      throw e;
    }
  });
}

// Nuke the browser from orbit: close the context, kill any process still
// holding the profile, clear all state. Deliberately NOT serialized — its whole
// job is to unstick a hung serialize chain (closing the context makes pending
// Playwright calls reject, which lets the chained job finish with an error).
export async function geminiForceRestart() {
  const c = ctx;
  ctx = null;
  page = null;
  pageCrashed = false;
  signedInConfirmed = false; // re-verify with the full deadline after a relaunch
  if (c) {
    await Promise.race([
      c.close().catch(() => {}),
      new Promise((r) => setTimeout(r, 5000)),
    ]);
  }
  await killOrphanBrowser();
}

export async function geminiClose() {
  try {
    if (ctx) await ctx.close();
  } catch {
    /* ignore */
  }
  ctx = null;
  page = null;
}
