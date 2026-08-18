# How to automate a local Content Studio

This is a handoff document for another agent. It describes the **automation layer** around a Codex-based blog writer that already exists for mariusmanolachi.com. Do not rebuild the writer from scratch. Rebuild or transplant the **loop that keeps posts moving without a human sitting on it**.

The live implementation lives in this repo but is **gitignored on purpose**:

- `.content-studio/` — runtime, workers, queue, isolated Codex home
- `app/content-studio/` — local dashboard
- `app/api/content-studio/` — local-only APIs
- `lib/content-studio/` — shared helpers

The **published blog** is tracked: `content/blog/`, `public/blog/`, `app/blog/`, `app/sitemap.xml`, `app/robots.ts`, `public/llms.txt`.

Assume Codex can already write a post into a job directory. The problem this doc solves is: **research topics, write several posts in parallel, image them in parallel, publish one at a time, survive laptop sleep/reboots, and only page a human when the machine is actually stuck.**

---

## 1. What you are building

A **local factory**, not a SaaS.

- It only accepts requests from localhost.
- It uses a **second ChatGPT / Codex login** that never touches the coding Codex home (`~/.codex`).
- It writes long-form GEO/SEO posts for one ICP.
- It stocks imaged drafts, then publishes them later with **today's public date**.
- A macOS launchd agent keeps a 60-second scheduler alive whenever the laptop is on.

Hard caps used here:

| Cap | Value | Why |
|---|---|---|
| Published posts per Berlin day | 10 (usually target 8–10) | Quality + crawl budget |
| Parallel writers | 5 | Isolated Plus account + long jobs |
| Parallel imagers | separate pool | Images must not steal writer slots |
| Live publishes at once | 1 | One git lock, one Vercel deploy |
| Word band | 6,000–10,000, aim 7,000 | Gate fails under 6k |
| Images | 8–12 | Hero + in-article rasters |
| Retries per job | 3, 5 minutes apart | Then quarantine, start a new post |

---

## 2. Process model

There are four long-lived or spawned processes. Do not collapse them into one script.

```
launchd KeepAlive (login session)
    ├── com.mariusmanolachi.content-studio
    │       └── scheduler.mjs          tick every 60s
    │               ├── topic-worker.mjs     research a topic bank
    │               ├── worker.mjs <id> --queue          write + image, stop at ready
    │               ├── worker.mjs <id> --publish-queued publish one ready draft
    │               └── worker.mjs <id> --resume-publish retry a failed publish
    └── com.mariusmanolachi.next-dev
            └── keep-desk-up.mjs       every 20s
                    ├── kickstart the scheduler if its pid is dead
                    └── next dev --turbopack --port 3002
```

Two launchd agents start at login. The scheduler is the factory: it counts today's live posts, writes, images, publishes, pushes `main`, and Vercel deploys. The Next.js app (`http://127.0.0.1:3002/content-studio`) is the **control surface**. Autopilot does **not** need the dashboard open to ship posts, but the desk must come back after a reboot so you can sign in Codex/Gemini and see the lamps. `keep-desk-up.mjs` heals both sides.

### Isolated Codex

```
CODEX_HOME=.content-studio/codex-home
CODEX_BIN=/Applications/ChatGPT.app/Contents/Resources/codex
model = gpt-5.6-luna
model_reasoning_effort = high
```

Auth lives in `.content-studio/codex-home/auth.json`. Coding stays in `~/.codex`. If you mix them, the blog factory will steal the coding session or the reverse.

Images default to Gemini via a signed-in Brave profile (`imageProvider: "gemini"`). Same chat for up to 10 images, then a fresh one. Codex `imagegen` is the fallback if Gemini is unsigned or hits a quota.

---

## 3. Job directory contract

Every post is a job id: `${Date.now()}-${uuid8}`.

```
.content-studio/jobs/<id>/
  idea.md
  research.md
  post.mdx
  review.md
  manifest.json
  state.json
  worker.lock          # pid of the live writer/imager
  worker.log
```

`worker.mjs` is the only process allowed to write those files. The scheduler only **spawns** it with arguments:

| Args | Meaning |
|---|---|
| `<id> <topic> --queue` | Write + image. Mark queue `ready`. Do not publish. |
| `<id> --publish-queued` | Validate, repair if needed, image if missing, publish. |
| `<id> --resume-publish` | Publish using existing images. |
| `<id> --resume-content` | Repair a failed draft, then continue. |
| `<id> <topic>` | Write, image, and publish immediately (manual “one post now”). |

A job that is only writing must not hold a global lock that blocks other writers. Use **per-job** `worker.lock`. A leftover global `worker.lock` is only for the single “publish now” path.

---

## 4. Queue is the source of truth

`.content-studio/queue.json` is the factory board.

Statuses:

```
generating → imaging → ready → publishing → published
                 ↘ failed → (retry ≤ 3) → quarantined
```

Rules that matter:

- **Writers** = jobs with `status: generating`.
- **Imagers** = jobs with `status: imaging` (and sometimes `publishing` if that step still makes images).
- `canStartMore()` counts **writers only**. An imaging job must not fill a writer slot. That is how five posts write while one is imaging.
- Autopilot `neededDrafts = remainingToday - ready - writing - imaging`. If you forget imaging, the scheduler thinks it still needs more drafts and over-produces.
- Publish **one** job at a time (`status: publishing`).
- Public `date` / `updated` are stamped in `publish()` to **Europe/Berlin today**, not the write day.

Git add during publish must be **slug-scoped**:

```
content/blog/<slug>.mdx
public/blog/<slug>-*
```

Never `git add content/blog`. That is how leftover drafts from yesterday ship with yesterday’s date and the wrong commit message.

---

## 5. Topic planning (do this before writers invent queries)

Parallel writers, left alone, pick the same head term. So research is a **separate job**.

`.content-studio/topics.json` is the bank.

1. `topic-worker.mjs` asks Codex to search live SERPs / PAA / Reddit and return JSON topics.
2. Merge rejects exact slugs **and** near-duplicates (same reader job, same object, subset queries).
3. `claimTopics(n, jobIds)` marks the next distinct ready topics `claimed`.
4. A writer is **assigned** that query. It must not switch to a “stronger” neighbor.
5. On success, `markTopicUsed`. On delete, `releaseTopicsForJob`. On quarantine, keep it used so you do not rewrite the same job.

Collision inventory (`collectTakenWork`) must include:

- live `content/blog/*.mdx` (`targetQuery`, `queryAliases`, slug)
- active queue jobs (not failed/published/quarantined)
- in-flight job files (`idea.md` / `post.mdx` / `manifest.json`)
- **except** the current job’s own slug (or you block repairs)

Exact slug/query match is not enough. Also block:

- high token overlap after stripping “how to / ai agent / business team”
- same empty-object + same verb family (`learn before building` vs `learn as a founder`)
- plan-mode same object (`consultant` already owned)

Hard mode is for the publish validator. Plan mode is stricter for the bank.

---

## 6. The write / image / publish pipeline

### Write

Codex `exec` into the job dir with skills mounted:

- `getfaster/ai-consulting-content-studio` (CONTENT_STUDIO.md + blog-pipeline)
- `gary-provost` + anti-AI patterns
- `seo-geo-playbook`
- DR21 `blog-post` structure as the quality bar

Required artifacts: `idea.md`, `research.md`, `post.mdx`, `review.md`, `manifest.json`.

Deterministic gate (must fail the job, not warn):

- 6,000–10,000 body words (strip code fences, images, raw URLs)
- at least 8 question H2s
- excerpt 100–170 chars, Quick Answer ≤ 60 words
- 5+ HTTPS sources, FAQ 3–8, 4+ pull-statements, one verbatim quote
- ≥2 internal `/blog/` links
- no `<!--`, no em dashes, no AI cliches
- 8–12 image requests, hero first, unique `__HERO_IMAGE__` / `__INLINE_IMAGE_n__`
- collision check against taken work

If the gate fails, Codex repairs in a loop. If it still fails after the repair budget, **do not publish**. Mark `failed`.

### Image

After the gate is green, generate rasters. Default: Codex imagegen, low effort, 4-wide. Writers can keep running on other jobs.

Gemini Playwright is optional: one signed-in Brave profile, reuse a chat for ~10 images, then a new chat. Romanian UI labels (`Trimite` / `Oprește`) will break a naive “Send” selector.

Never leave `<!-- visual-slot -->` in MDX. Next.js will fail the production build.

### Publish

One at a time:

1. Stamp `date` and `updated` to Berlin today.
2. Replace placeholders with `/blog/<slug>-<id>.png`.
3. Write **only** `content/blog/<slug>.mdx`.
4. `next build` into `.next-content-studio-build` (do not clobber the running `next dev` `.next`).
5. Commit `Publish <slug>`, push `main`, Vercel deploys.
6. Poll the live URL until title + path appear, or fail after ~10 minutes.
7. Ping IndexNow with the live URL + `/blog`.

If a different post already occupies that slug, that is **fatal**. Do not retry 3 times. Quarantine and start a new query.

---

## 7. Autopilot tick (the actual automation)

`scheduler.mjs` loads `.env` / `.env.local`, then every 60 seconds:

```
if stop file exists: exit tick
if disabled or target 0: pause
if publishedToday >= target: stop for the day

if Codex not logged in: Telegram once, wait
if images=gemini and Brave not signed in: Telegram once, wait

if nobody is publishing:
  if a failed job is fatal OR retries >= 3:
      quarantine it, mark topic used, Telegram "moving on", fall through
  else if a failed job is retryable (count < 3, 5 min since last):
      spawn --resume-publish or --publish-queued
      return
  if a ready draft exists:
      spawn --publish-queued for the first one
      return

neededDrafts = remaining - ready - writing - imaging
if neededDrafts > 0 and topic bank < 3 and research not running:
    spawn topic-worker
    return
if neededDrafts > 0 and no topics:
    Telegram once
    return
if neededDrafts > 0 and writers < 5 and a unique topic is claimable:
    claim 1 topic, spawn writer --queue
    return
```

That order is the product:

1. Unstick or drop dead jobs.
2. Ship ready inventory (public date = today).
3. Restock the bank.
4. Write ahead, up to 5, without counting imagers as writers.

Do **not** implement “daily-batch” as “return immediately if a batch was already scheduled.” That is how nothing runs.

---

## 8. Keep-alive on a laptop

A Node process started from a chat dies when the session dies. Use launchd.

Two agents. Copies live in `.content-studio/` and must also be installed under `~/Library/LaunchAgents/`.

`com.mariusmanolachi.content-studio.plist` — the daily factory:

- `ProgramArguments`: absolute `node` + absolute `scheduler.mjs`
- `WorkingDirectory`: repo root
- `RunAtLoad` + `KeepAlive` (true, not only on crash)
- `LimitLoadToSessionType`: `Aqua` (starts when you log into the Mac GUI)
- `ThrottleInterval`: 15
- stdout/stderr into `.content-studio/scheduler.log` and `scheduler.err.log`
- `PATH` must include the same Node as the dashboard

`com.mariusmanolachi.next-dev.plist` — the localhost desk:

- `ProgramArguments`: absolute `node` + absolute `keep-desk-up.mjs`
- Same `RunAtLoad` / `KeepAlive` / `Aqua`
- Every 20s: if the scheduler pid is dead, `launchctl kickstart` the factory; if `http://127.0.0.1:3002/content-studio` is down and nothing is bound on 3002, start `next dev --turbopack --port 3002`

On start, the scheduler **SIGTERMs any other scheduler pid** in `scheduler.pid` and stays up. Otherwise two agents fight, or a new one exits 0 because an old one exists.

Reload after editing either script:

```
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mariusmanolachi.content-studio.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mariusmanolachi.next-dev.plist
launchctl kickstart -k gui/$(id -u)/com.mariusmanolachi.content-studio
launchctl kickstart -k gui/$(id -u)/com.mariusmanolachi.next-dev
```

The Next studio can also `ensureScheduler()` on settings GET so opening the dashboard heals a dead factory via launchctl, not a rogue detached node.

---

## 9. Human attention (Telegram, not chat)

Only page the human when the machine cannot proceed.

Env (never commit):

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Load both `.env.local` and `.env`. Surface `telegramConfigured: true/false` on the dashboard. Never return the token.

Send a Telegram when:

- Blog Codex is signed out
- Gemini is required and unsigned
- Topic bank is empty and research cannot start
- A job is quarantined (short “dropped, starting another”, not “needs you”)

Do **not** Telegram every successful publish. That trains the human to ignore the channel.

Fatal errors that skip retries:

- `A different post already exists at content/blog/...`
- collision / “already owned” / “pick a different reader job”

Quarantine = move `jobs/<id>` → `quarantine/<id>`, status `quarantined`, keep files for inspection.

---

## 10. Dashboard (optional but useful)

The desk is an operations console, not a settings dump. First viewport should answer:

- How many live today vs target?
- Codex signed in? Images ready? Telegram ready? Scheduler alive?
- How much Plus usage is left? (ChatGPT `wham/usage` with the isolated access token, fallback to latest session `rate_limits`)
- Which jobs are writing / imaging / publishing?
- What is owned vs ready vs blocked overlap?

Local-only: if the request is not loopback, `404`.

---

## 11. Site contract the factory publishes into

This is the destination adapter. Another site needs the same shape or a thin rewrite.

**Post file:** `content/blog/<slug>.mdx`

Frontmatter that the live page and GEO gate both need:

```yaml
title: 'Query words first, <=72 chars'
date: 'YYYY-MM-DD'          # stamped on publish day
updated: 'YYYY-MM-DD'
excerpt: '100-170 chars'
answer: '<=60 words, complete'
author: 'Marius Manolachi'
targetQuery: 'the one query'
queryAliases: []
intent: informational|diagnostic|implementation|commercial
funnel: awareness|consideration|decision
cluster: '...'
tags: []
sources: ['https://...']    # >= 5
faq: [{ q, a }]             # 3-8
cover: '/blog/<slug>-...png'
coverAlt: '...'
draft: false
```

Live page must render:

- Quick Answer (speakable)
- FAQ + FAQPage JSON-LD
- Article JSON-LD
- internal links that actually exist

Also:

- `app/sitemap.xml` with lastmod + image entries
- `robots.ts` allowing GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, ClaudeBot, PerplexityBot, Applebot-Extended; disallow `/content-studio`
- `public/llms.txt`
- IndexNow key in `public/<32hex>.txt` and ping after live verify
- ESLint ignore for studio paths so a local unused var cannot fail `next build`

Vercel installs with **pnpm frozen lockfile**. If you add a dependency (`playwright-core`, etc.), update `pnpm-lock.yaml` and set `"packageManager": "pnpm@10.x"`.

---

## 12. How to transplant this onto another site

The writer already works. Do this in order.

1. **Isolate a second Codex login.** New `CODEX_HOME`. Confirm `codex login status` against that home, not stdout-only.
2. **Copy the job contract.** One directory per post. Five artifacts. One validator. One repair loop.
3. **Add a queue file** and the status machine above. Split writer vs imager counts.
4. **Add topic research + claim.** Do not let five writers pick a query.
5. **Add `publish()`** that stamps today’s date, builds, commits one slug, pushes, verifies live, IndexNow.
6. **Add `scheduler.mjs`** with the tick order in §7. Keep it dumb and file-based.
7. **Install both launchd agents** (factory + `keep-desk-up`). Prove a reboot brings back the 60s tick **and** `http://127.0.0.1:3002/content-studio`.
8. **Add Telegram** for the four stuck states only.
9. **Cap the day.** Count live posts by Berlin `date:` frontmatter, not by git commit time.
10. **Quarantine after 3 failures.** Never retry a slug collision.

Minimum files to recreate the loop:

```
.content-studio/scheduler.mjs
.content-studio/keep-desk-up.mjs
.content-studio/worker.mjs
.content-studio/topic-worker.mjs
.content-studio/com.<name>.content-studio.plist
.content-studio/com.<name>.next-dev.plist
lib/content-studio/queue.mjs
lib/content-studio/topics.mjs
lib/content-studio/inventory.mjs
lib/content-studio/telegram.mjs
lib/content-studio/codex-account.ts
lib/content-studio/local-only.ts
```

The dashboard and Gemini bridge are optional once Codex images work.

---

## 13. Procedural knowledge (the bugs that will recur)

These are not style notes. They are the reasons the first versions did not run unattended.

**Writers clobber global state.** If every job writes `.content-studio/state.json` as “the current run”, job B replaces job A and A dies with “this job was replaced.” Keep per-job `jobs/<id>/state.json`. The global file is only for the dashboard’s “one current publish.”

**`codex login status` can lie.** Read `auth.json` email as well as stdout. Isolated home is the source of truth.

**Launchd exiting 0 is a silent death.** If the new process finds an old pid and exits successfully, KeepAlive will not restart it. Kill the old pid and stay alive.

**Publish date is not the write date.** Stamp on the way to `content/blog`. Otherwise a draft written Sunday and shipped Monday is dated Sunday, and the daily cap lies.

**`git add content/blog` is a footgun.** Unpublished siblings ride along. Add one slug.

**Word count must be a hard fail.** Luna will happily ship ~3k. The gate counts body words after stripping images and URLs. Under 6,000 → repair or fail. Do not publish. Aim 7,000. Require 8+ question H2s so expansion is new sections, not padded paragraphs.

**Collision excepts the current slug.** Otherwise a job cannot repair its own post.

**Imaging is not writing.** If you count imaging jobs toward `MAX_PARALLEL_GENERATE`, you stop the factory whenever images run.

**EEXIST overwrite only if the title matches.** A different title on the same slug is a different post. Quarantine.

**Studio ESLint can block publish.** The production build used to lint gitignored studio files. Ignore those paths, or set `ignoreDuringBuilds` when `NEXT_DIST_DIR=.next-content-studio-build`.

**Build into a side dist dir.** `NEXT_DIST_DIR=.next-content-studio-build` so verify-build does not kill `next dev`.

**Do not commit `.env`, tokens, or the studio.** Commit posts, images, sitemap, robots, llms.txt, IndexNow key file.

**Plus usage is shared on that second account.** Writing 7k posts + 8 images × several jobs will chew the weekly window. Read `https://chatgpt.com/backend-api/wham/usage` with the isolated access token. If remaining < 20%, stop starting new writers and Telegram.

---

## 14. Daily operating picture

When the laptop is awake and autopilot is on:

1. Research if the bank is thin.
2. Keep up to 5 writers filling unique queries.
3. As each write passes the gate, image it on a separate worker.
4. Park imaged drafts as `ready`.
5. Publish one ready draft at a time until today’s target exists on the live site.
6. Stamp each live date as today.
7. If a job is a slug collision or fails 3 times, quarantine and start a different query.
8. If Codex is logged out or the topic bank is empty, text Telegram and wait.

A human should only open the desk to sign Codex in, restock env, or inspect quarantine. Everything else is the tick.

---

## 15. Commands another agent will actually need

```bash
# Isolated login (Terminal window, blog account only)
CODEX_HOME="$PWD/.content-studio/codex-home" \
  /Applications/ChatGPT.app/Contents/Resources/codex login

# Scheduler + localhost desk (both start at login)
launchctl kickstart -k gui/$(id -u)/com.mariusmanolachi.content-studio
launchctl kickstart -k gui/$(id -u)/com.mariusmanolachi.next-dev
tail -f .content-studio/scheduler.log .content-studio/next-dev.log

# Manual
node .content-studio/topic-worker.mjs 12
node .content-studio/worker.mjs <id> "the exact query" --queue
node .content-studio/worker.mjs <id> --publish-queued

# After Vercel is live
node scripts/indexnow.mjs --url https://mariusmanolachi.com/blog/<slug>
```

Dashboard: `http://127.0.0.1:3002/content-studio` (local only).

Settings file: `.content-studio/settings.json`

```json
{
  "enabled": true,
  "postsPerDay": 9,
  "scheduleMode": "autopilot",
  "imageProvider": "codex"
}
```

`scheduleMode: "spread"` turns autopilot off. Anything else is treated as autopilot.

---

## 16. Definition of done for a transplant

You are done when all of these are true without a human in the loop:

- The laptop reboots, launchd starts the scheduler **and** the :3002 desk, and a tick runs within a minute.
- Five different queries can write at once without clobbering each other.
- An imaging job does not block a new writer.
- A ready draft published on Tuesday has `date: Tuesday`.
- A slug that already exists is quarantined on the first failure.
- A soft failure retries 3 times, then quarantines, then a **new** query starts.
- Telegram fires only when Codex/topics/Gemini need a human.
- `git log` on `main` shows one `Publish <slug>` commit per live post, not a bundle of leftovers.
- Live `/sitemap.xml` lists the new URL after deploy.

If any of those fail, the factory is not automated yet. Fix the loop before adding more writers.
