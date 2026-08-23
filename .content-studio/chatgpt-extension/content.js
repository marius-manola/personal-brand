const STUDIO = 'http://127.0.0.1:3002/api/content-studio/chatgpt';
window.__contentStudioVersion = '1.4.0';
let activeTurn = null;
let thinkEnabled = false;

function detectPlan() {
  const text = (document.body?.innerText || '').slice(0, 2500);
  if (/\bFree\b/.test(text) && /Upgrade/i.test(text)) return 'free';
  if (/\bPlus\b|\bPro\b/.test(text)) return 'plus';
  return 'unknown';
}

function studioUrl(event = 'poll') {
  const params = new URLSearchParams({
    plan: detectPlan(),
    url: location.href,
    event,
  });
  return `${STUDIO}?${params}`;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function studio(options = {}) {
  const method = options.method || 'GET';
  try {
    const directOptions = { method, targetAddressSpace: 'local' };
    if (method === 'POST') {
      directOptions.headers = { 'Content-Type': 'application/json' };
      directOptions.body = options.body;
    }
    const direct = await fetch(method === 'GET' ? studioUrl(options.event || 'poll') : STUDIO, directOptions);
    const data = await direct.json().catch(() => ({}));
    if (!direct.ok) throw new Error(`Studio returned ${direct.status}: ${data.error || ''}`.trim());
    return data;
  } catch (directError) {
    const response = await chrome.runtime.sendMessage({
      type: 'studio-fetch', method, body: options.body,
      plan: detectPlan(), url: location.href, event: options.event || (method === 'GET' ? 'poll' : 'post'),
    }).catch(() => null);
    if (response?.ok) return response.data;
    const fallback = response?.error || (response?.status ? `Studio returned ${response.status}: ${response?.data?.error || ''}` : '');
    throw new Error(fallback || (directError instanceof Error ? directError.message : String(directError)));
  }
}

function composer() {
  return document.querySelector('#prompt-textarea, [data-testid="prompt-textarea"], div[contenteditable="true"]#prompt-textarea, textarea#prompt-textarea, form [contenteditable="true"][role="textbox"]');
}

function labelFor(button) {
  return `${button.getAttribute('aria-label') || ''} ${button.getAttribute('data-testid') || ''} ${button.textContent || ''}`.trim();
}

function sendButton() {
  const named = document.querySelector('button[data-testid="send-button"], button[data-testid="composer-send-button"]');
  if (named && !named.disabled) return named;
  return [...document.querySelectorAll('button')].find((button) => {
    if (button.disabled) return false;
    return /send prompt|send message|submit/i.test(labelFor(button));
  }) || null;
}

function stopButton() {
  return document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop" i]');
}

function assistantNodes() {
  const byRole = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
  if (byRole.length) return byRole;
  return [...document.querySelectorAll('[data-turn="assistant"]')];
}

function assistantMessages() {
  return assistantNodes();
}

function isSearchOrThinkingStatus(text) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return true;
  if (source.length > 160) return false;
  return /^(searching(\s+\d+\s+websites?)?|searching the web|thought for\b|thinking\b|working on it|browsing\b|reading\b)/i.test(source)
    || /searching \d+ websites?/i.test(source);
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

function thinkButton() {
  return [...document.querySelectorAll('button')].find((button) => {
    const label = labelFor(button);
    return /^think$/i.test(label) || /thinking mode|reason(ing)?/i.test(label);
  }) || document.querySelector('button[aria-label*="Think" i], button[data-testid*="think" i]');
}

function thinkIsOn() {
  const button = thinkButton();
  if (!button) return /thinking/i.test(document.body?.innerText || '') && !!document.querySelector('[data-testid="stop-button"]');
  return button.getAttribute('aria-pressed') === 'true' || button.getAttribute('aria-checked') === 'true' || /selected|active|on/i.test(button.className);
}

async function applyThinkSetting(wantOn) {
  const button = thinkButton();
  if (!button) return;
  const on = thinkIsOn();
  if (wantOn && !on) {
    button.click();
    await delay(200);
  }
  if (!wantOn && on) {
    button.click();
    await delay(200);
  }
}

async function enterPrompt(text) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const input = composer();
    if (input) {
      await applyThinkSetting(thinkEnabled);
      insertIntoComposer(input, text);
      let button = null;
      for (let buttonAttempt = 0; buttonAttempt < 24; buttonAttempt += 1) {
        await delay(250);
        button = sendButton();
        if (button) break;
      }
      if (!button) throw new Error('ChatGPT send button was not found.');
      button.click();
      return;
    }
    await delay(500);
  }
  throw new Error('ChatGPT prompt box was not found. Stay on chatgpt.com and keep the chat open.');
}

function hasLimitMessage() {
  const text = document.body?.innerText || '';
  return /you(?:'|’)ve reached (?:your |the )?(?:usage |message )?limit|usage limit|upgrade to (?:go|plus|pro)|try again (?:later|tomorrow)|too many requests/i.test(text);
}

function serializeMarkdown(node) {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const tag = node.tagName.toLowerCase();
  const inner = [...node.childNodes].map(serializeMarkdown).join('');
  if (tag === 'h1') return `# ${inner.trim()}\n\n`;
  if (tag === 'h2') return `## ${inner.trim()}\n\n`;
  if (tag === 'h3') return `### ${inner.trim()}\n\n`;
  if (tag === 'h4') return `#### ${inner.trim()}\n\n`;
  if (tag === 'em' || tag === 'i') return `__${inner}__`;
  if (tag === 'strong' || tag === 'b') return inner.includes('HERO_IMAGE') || inner.includes('INLINE_IMAGE') ? `__${inner}__` : `**${inner}**`;
  if (tag === 'li') return `- ${inner.trim()}\n`;
  if (tag === 'ul' || tag === 'ol') return `${inner}\n`;
  if (tag === 'pre') return `${node.innerText || inner}\n`;
  if (tag === 'code' && node.parentElement?.tagName !== 'PRE') return `\`${inner}\``;
  if (tag === 'p') return `${inner}\n\n`;
  if (tag === 'br') return '\n';
  if (tag === 'hr') return '---\n\n';
  if (tag === 'img') {
    const alt = node.getAttribute('alt') || '';
    const src = node.getAttribute('src') || '';
    return `![${alt}](${src})`;
  }
  return inner;
}

function lastAssistantMarkdown() {
  const messages = assistantMessages();
  const last = messages[messages.length - 1];
  if (!last) return '';
  const root = last.querySelector('.markdown, .prose, [class*="markdown"]') || last;
  const markdown = serializeMarkdown(root).trim();
  const plain = (last.innerText || '').trim();
  const markdownLooksRicher = markdown.includes('## ') || markdown.includes('---') || markdown.includes('__HERO_IMAGE__') || markdown.includes('```');
  return markdownLooksRicher ? markdown : (markdown.length >= plain.length ? markdown : plain);
}

function lastAssistantText() {
  return lastAssistantMarkdown();
}

async function copyLastAssistant() {
  const messages = assistantMessages();
  const last = messages[messages.length - 1];
  if (!last) return '';
  const copy = [...last.querySelectorAll('button')].find((button) => /copy/i.test(labelFor(button)));
  if (!copy) return '';
  copy.click();
  await delay(250);
  try {
    const text = await navigator.clipboard.readText();
    return text && text.length > 40 ? text.trim() : '';
  } catch {
    return '';
  }
}

async function waitForAnswer(previousText) {
  const deadline = Date.now() + 8 * 60 * 1000;
  const started = Date.now();
  let sawStop = false;
  let stableText = '';
  let stableSince = 0;
  while (Date.now() < deadline) {
    await delay(1000);
    if (hasLimitMessage() && !stopButton()) {
      throw new Error('ChatGPT reported a usage limit. Stay signed in and try again later.');
    }
    if (/Something went wrong\. Please try again/i.test(document.body?.innerText || '') && !stopButton()) {
      throw new Error('ChatGPT showed “Something went wrong.” Retrying the same turn.');
    }
    if (stopButton()) {
      sawStop = true;
      stableText = '';
      stableSince = 0;
      continue;
    }
    const text = lastAssistantText();
    if (isSearchOrThinkingStatus(text)) continue;
    if (!text || text === previousText || text.length < 40) continue;
    if (text === stableText) {
      if (stableSince && Date.now() - stableSince >= 2500 && (sawStop || Date.now() - started > 8000)) return text;
    } else {
      stableText = text;
      stableSince = Date.now();
    }
  }
  throw new Error('ChatGPT did not finish answering within 8 minutes.');
}

function conversationIdFromUrl(url = location.href) {
  return (String(url).match(/\/c\/([a-z0-9-]+)/i) || [])[1] || '';
}

function conversationHasHistory() {
  if (assistantNodes().length > 0) return true;
  if (document.querySelector('[data-message-author-role="user"], [data-turn="user"]')) return true;
  return Boolean(lastAssistantText());
}

function isBlankNewChat() {
  return !conversationIdFromUrl() && !conversationHasHistory() && Boolean(composer());
}

function onLockedThread(threadUrl) {
  const want = conversationIdFromUrl(threadUrl);
  return Boolean(want) && want === conversationIdFromUrl();
}

async function releaseTurn(job, reason) {
  await studio({
    method: 'POST',
    body: JSON.stringify({ type: 'error', jobId: job.id, turnId: job.turnId, error: reason }),
  }).catch(() => {});
}

async function moveTo(url) {
  if (location.href.split('?')[0] === String(url).split('?')[0]) return;
  location.assign(url);
}

async function processJob(job) {
  activeTurn = `${job.id}:${job.turnId}`;
  const pageUrl = location.href;
  if (job.threadUrl) {
    if (!onLockedThread(job.threadUrl)) {
      await releaseTurn(job, `Wrong chat ${pageUrl}; moving to locked thread ${job.threadUrl}`);
      await moveTo(job.threadUrl);
      activeTurn = null;
      return;
    }
  } else if (job.newChat || job.continueChat === false) {
    if (!isBlankNewChat()) {
      await releaseTurn(job, `Wrong chat ${pageUrl}; opening https://chatgpt.com/`);
      await moveTo('https://chatgpt.com/');
      activeTurn = null;
      return;
    }
  }
  const previousText = lastAssistantText();
  await enterPrompt(job.prompt);
  await studio({
    method: 'POST',
    body: JSON.stringify({ type: 'sent', jobId: job.id, turnId: job.turnId, url: location.href, plan: detectPlan() }),
  });
  await waitForAnswer(previousText);
  const copied = await copyLastAssistant();
  const rendered = lastAssistantMarkdown();
  const text = (copied.includes('===== FILE:') || copied.includes('__HERO_IMAGE__') || copied.includes('---\n')) ? copied : rendered;
  let lastError = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await studio({
        method: 'POST',
        body: JSON.stringify({ type: 'response', jobId: job.id, turnId: job.turnId, text, url: location.href }),
      });
      lastError = '';
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await delay(1500);
    }
  }
  if (lastError) {
    const statusMatch = lastError.match(/Studio returned (\d+)/);
    await studio({
      method: 'POST',
      body: JSON.stringify({
        type: 'error',
        jobId: job.id,
        turnId: job.turnId,
        status: statusMatch ? Number(statusMatch[1]) : 500,
        error: lastError,
      }),
    }).catch(() => {});
    activeTurn = null;
    return;
  }
  await chrome.storage.local.set({ lastCompletedTurn: activeTurn });
  activeTurn = null;
}

async function tick() {
  try {
    const result = await studio({ event: /\/c\//.test(location.pathname) ? 'poll' : 'home' });
    if (typeof result.thinkEnabled === 'boolean') thinkEnabled = result.thinkEnabled;
    await applyThinkSetting(thinkEnabled);
    const job = result.job;
    const key = job ? `${job.id}:${job.turnId}` : '';
    if (!job || key === activeTurn) return;
    const { lastCompletedTurn } = await chrome.storage.local.get('lastCompletedTurn');
    if (lastCompletedTurn === key) return;
    await processJob(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (activeTurn) {
      const [jobId, turnId] = activeTurn.split(':');
      await studio({
        method: 'POST',
        body: JSON.stringify({ type: 'error', jobId, turnId, error: message }),
      }).catch(() => {});
      activeTurn = null;
    }
  }
}

async function start() {
  if (document.documentElement.hasAttribute('data-content-studio-companion')) return;
  document.documentElement.setAttribute('data-content-studio-companion', String(Date.now()));
  tick();
  setInterval(tick, 4000);
}

start();
