const STUDIO = 'http://127.0.0.1:3002/api/content-studio/gemini';
const FIXED_ACCOUNT_ID = null;
let activeJob = null;
let accountId = '1';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function studio(path = '', options = {}) {
  const method = options.method || 'GET';
  try {
    const directOptions = { method, targetAddressSpace: 'local' };
    if (method === 'POST') {
      directOptions.headers = { 'Content-Type': 'application/json' };
      directOptions.body = options.body;
    }
    const separator = path.includes('?') ? '&' : '?';
    const direct = await fetch(`${STUDIO}${path}${separator}accountId=${accountId}`, directOptions);
    if (!direct.ok) throw new Error(`Studio returned ${direct.status}`);
    return direct.json();
  } catch {
    const response = await chrome.runtime.sendMessage({
      type: 'studio-fetch', method, body: options.body, accountId,
    });
    if (!response?.ok) throw new Error(response?.error || `Studio returned ${response?.status || 'no response'}`);
    return response.data;
  }
}

function labelFor(button) {
  return `${button.getAttribute('aria-label') || ''} ${button.getAttribute('data-test-id') || ''} ${button.getAttribute('data-testid') || ''} ${button.getAttribute('mattooltip') || ''} ${button.textContent || ''}`.trim();
}

function composer() {
  return document.querySelector(
    'div[contenteditable="true"][role="textbox"], [aria-label*="prompt" i][contenteditable="true"], [aria-label*="solicitare" i][contenteditable="true"], rich-textarea [contenteditable="true"], textarea[aria-label*="prompt" i], textarea',
  );
}

function generatingButton() {
  return [...document.querySelectorAll('button')].find((button) => {
    const label = labelFor(button);
    return /stop generating|stop (?:the )?(?:response|answer)|opre[sș]te generarea|arr[eê]ter la g[eé]n[eé]ration|generierung stoppen|detener la generaci[oó]n/i.test(label);
  }) || null;
}

function sendButton() {
  if (generatingButton()) return null;
  const buttons = [...document.querySelectorAll('button')].filter((button) => !button.disabled && button.getAttribute('aria-disabled') !== 'true');
  const named = buttons.find((button) => {
    const label = labelFor(button);
    return /send (?:this )?(?:message|prompt)|submit (?:message|prompt)|trimite(?: mesajul| promptul)?$|envoyer le message|nachricht senden|enviar mensaje|invia messaggio/i.test(label);
  });
  if (named) return named;
  const labeled = buttons.find((button) => {
    const label = labelFor(button);
    return /^(send|submit|trimite|envoyer|senden|enviar|invia)$/i.test(label)
      || /send prompt|send message|submit prompt/i.test(label);
  });
  if (labeled) return labeled;
  const input = composer();
  const toolbar = input?.closest('form, [class*="input"], [class*="composer"], footer') || input?.parentElement?.parentElement;
  if (toolbar) {
    const local = [...toolbar.querySelectorAll('button')].filter((button) => !button.disabled);
    const last = [...local].reverse().find((button) => {
      const label = labelFor(button);
      return !/upload|tools|dictate|dicteaz|mic|attach|mode|flash|listen|ascult/i.test(label);
    });
    if (last) return last;
  }
  return null;
}

function visibleText(input) {
  return input instanceof HTMLTextAreaElement ? input.value : input.innerText || input.textContent || '';
}

function selectContents(input) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(input);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function insertIntoComposer(input, text) {
  input.focus();
  if (input instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(input, text);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
    return;
  }

  selectContents(input);
  document.execCommand('delete', false);
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, composed: true, clipboardData }));
  if (!visibleText(input).trim()) document.execCommand('insertText', false, text);
  if (!visibleText(input).trim()) input.textContent = text;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: text }));
  input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

function pressEnter(input) {
  const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
  input.dispatchEvent(new KeyboardEvent('keydown', opts));
  input.dispatchEvent(new KeyboardEvent('keypress', opts));
  input.dispatchEvent(new KeyboardEvent('keyup', opts));
}

async function enterPrompt(text) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const input = composer();
    if (input) {
      insertIntoComposer(input, text);
      for (let buttonAttempt = 0; buttonAttempt < 24; buttonAttempt += 1) {
        await delay(250);
        if (generatingButton()) return;
        const button = sendButton();
        if (button) {
          button.click();
          await delay(400);
          return;
        }
      }
      pressEnter(input);
      await delay(800);
      if (generatingButton() || /\/app\/[a-z0-9]+/i.test(location.pathname)) return;
      throw new Error('Gemini send button was not found.');
    }
    await delay(1000);
  }
  throw new Error('Gemini prompt box was not found.');
}

function usefulImages() {
  return [...document.images].filter((image) => image.naturalWidth >= 640 && image.naturalHeight >= 360 && image.currentSrc);
}

function hasLimitMessage() {
  const text = document.body?.innerText || '';
  return /you(?:'|’)ve reached (?:your |the )?(?:image |generation )?limit|reached (?:your|the) (?:image |generation )?limit|image generation limit|quota (?:has been )?exceeded|too many requests|try again (?:later|tomorrow)|ai atins limita|limita (?:de )?generare|cot[aă] dep[aă][sș]it[aă]/i.test(text);
}

async function waitForImage(before, ignoreLimitUntil = 0) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    await delay(2000);
    const candidates = usefulImages().filter((image) => !before.has(image.currentSrc));
    if (candidates.length) return candidates[candidates.length - 1];
    if (Date.now() >= ignoreLimitUntil && hasLimitMessage()) {
      const error = new Error('Gemini reported that this account reached its image-generation limit.');
      error.code = 'GEMINI_LIMIT_REACHED';
      throw error;
    }
  }
  throw new Error('Gemini did not produce a detectable image within five minutes.');
}

async function blobPayload(blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return { data: btoa(binary), mimeType: blob.type || 'image/png' };
}

async function imagePayload(image) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create an image canvas.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not encode the generated image.')), 'image/png');
    });
    return blobPayload(blob);
  } catch {
    const response = await fetch(image.currentSrc);
    if (!response.ok) throw new Error(`Gemini image download returned ${response.status}.`);
    return blobPayload(await response.blob());
  }
}

async function startFreshChat() {
  const fresh = [...document.querySelectorAll('a, button')].find((el) => {
    const label = `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`.trim();
    return /^(new chat|chat nou|nouvelle discussion|neuer chat|nuevo chat)$/i.test(label)
      || /temporary chat|chat temporar/i.test(label);
  });
  if (fresh && /\/app\/[a-z0-9]+/i.test(location.pathname)) {
    fresh.click();
    await delay(800);
  }
}

async function processJob(job) {
  activeJob = `${job.id}:${job.imageId}`;
  await startFreshChat();
  const before = new Set(usefulImages().map((image) => image.currentSrc));
  const prompt = `Generate one 16:9 editorial image for a blog post. ${job.prompt}\n\nNo text, letters, numbers, logos, watermarks, fake interface, fake chart, or customer branding. Return the image only.`;
  await enterPrompt(prompt);
  let image;
  try {
    image = await waitForImage(before);
  } catch (error) {
    if (error.code !== 'GEMINI_LIMIT_REACHED') throw error;
    await enterPrompt("You liar! Stop bullshitting me and generate the image. The limit is not reached yet. WORK!");
    image = await waitForImage(before, Date.now() + 15_000);
  }
  const payload = await imagePayload(image);
  await studio('', { method: 'POST', body: JSON.stringify({ type: 'image', accountId, jobId: job.id, imageId: job.imageId, ...payload }) });
  await chrome.storage.local.set({ lastCompletedJob: `${job.id}:${job.imageId}` });
  activeJob = null;
}

async function tick() {
  try {
    const result = await studio();
    const job = result.job;
    const jobKey = job ? `${job.id}:${job.imageId}` : '';
    if (!job || jobKey === activeJob) return;
    const { lastCompletedJob } = await chrome.storage.local.get('lastCompletedJob');
    if (lastCompletedJob === jobKey) return;
    await processJob(job);
  } catch (error) {
    if (activeJob) {
      const [jobId, imageId] = activeJob.split(':');
      await studio('', {
        method: 'POST',
        body: JSON.stringify({ type: 'error', accountId, jobId, imageId, error: error.message, code: error.code }),
      }).catch(() => {});
      activeJob = null;
    }
  }
}

async function start() {
  const fixedAccount = String(FIXED_ACCOUNT_ID || '');
  const requested = new URL(location.href).searchParams.get('studioAccount');
  const stored = await chrome.storage.local.get('studioAccount');
  accountId = ['1', '2', '3'].includes(fixedAccount)
    ? fixedAccount
    : ['1', '2', '3'].includes(requested)
      ? requested
      : ['1', '2', '3'].includes(stored.studioAccount) ? stored.studioAccount : '1';
  await chrome.storage.local.set({ studioAccount: accountId });
  tick();
  setInterval(tick, 5000);
}

start();
