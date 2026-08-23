import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const STUDIO = 'http://127.0.0.1:3002/api/content-studio/chatgpt';
const STATE_FILE = join(ROOT, '.content-studio', 'state.json');
const CONTENT = readFileSync(join(ROOT, '.content-studio', 'chatgpt-extension', 'content.js'), 'utf8');
const PORT = 9230;
let client = null;

function log(message) {
  appendFileSync(join(ROOT, '.content-studio', 'chatgpt-bridge.log'), `${new Date().toISOString()} ${message}\n`);
}

function bootstrapExpression() {
  return `(() => {
      if (window.__contentStudioChatGPTInjected) return 'already-connected';
      window.__contentStudioChatGPTInjected = true;
      const pending = new Map();
      let requestId = 0;
      window.__studioResolve = (id, value) => {
        const resolve = pending.get(id);
        if (!resolve) return;
        pending.delete(id);
        resolve(value);
      };
      window.__studioRequest = (message) => new Promise((resolve) => {
        const id = ++requestId;
        pending.set(id, resolve);
        window.__studioNative(JSON.stringify({ id, message }));
      });
      const storageKey = '__contentStudioChatGPTStorage';
      const readStorage = () => { try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch { return {}; } };
      const chromeObject = window.chrome || {};
      chromeObject.runtime = { sendMessage: window.__studioRequest };
      chromeObject.storage = { local: {
        get: async (key) => {
          const stored = readStorage();
          if (typeof key === 'string') return { [key]: stored[key] };
          if (Array.isArray(key)) return Object.fromEntries(key.map((item) => [item, stored[item]]));
          return stored;
        },
        set: async (values) => sessionStorage.setItem(storageKey, JSON.stringify({ ...readStorage(), ...values })),
      }};
      window.chrome = chromeObject;
      (() => { ${CONTENT}\n })();
      return 'connected';
    })()`;
}

class CdpClient {
  constructor(target) {
    this.target = target;
    this.nextId = 1;
    this.pending = new Map();
    this.closed = false;
    this.ws = new WebSocket(target.webSocketDebuggerUrl);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => this.onMessage(event));
    this.ws.addEventListener('close', () => { this.closed = true; });
    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Runtime.addBinding', { name: '__studioNative' });
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source: bootstrapExpression() }).catch(() => {});
    await this.inject();
    log(`Connected to ${this.target.url}`);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 15_000).unref();
    });
  }

  async onMessage(event) {
    const packet = JSON.parse(String(event.data));
    if (packet.id) {
      const pending = this.pending.get(packet.id);
      if (!pending) return;
      this.pending.delete(packet.id);
      if (packet.error) pending.reject(new Error(packet.error.message));
      else pending.resolve(packet.result);
      return;
    }
    if (packet.method === 'Page.frameNavigated' && !packet.params?.frame?.parentId) {
      this.inject().then(() => log(`Re-injected after navigation to ${packet.params?.frame?.url || 'unknown'}`)).catch((error) => {
        log(`Re-inject failed: ${error.message}`);
      });
      return;
    }
    if (packet.method !== 'Runtime.bindingCalled' || packet.params?.name !== '__studioNative') return;
    try {
      const payload = JSON.parse(packet.params.payload);
      const message = payload.message || {};
      const method = message.method === 'POST' ? 'POST' : 'GET';
      const options = { method };
      if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = message.body || '{}';
      }
      const params = new URLSearchParams({
        plan: message.plan || '',
        url: message.url || this.target.url || '',
        event: message.event || 'poll',
      });
      const endpoint = method === 'GET' ? `${STUDIO}?${params}` : STUDIO;
      const response = await fetch(endpoint, options);
      const data = await response.json().catch(() => ({}));
      await this.resolvePage(payload.id, { ok: response.ok, status: response.status, data });
    } catch (error) {
      log(`Request failed: ${error.message}`);
    }
  }

  async resolvePage(id, value) {
    await this.send('Runtime.evaluate', {
      expression: `window.__studioResolve(${JSON.stringify(id)}, ${JSON.stringify(value)})`,
      awaitPromise: false,
    }).catch(() => {});
  }

  async inject() {
    const result = await this.send('Runtime.evaluate', { expression: bootstrapExpression(), awaitPromise: true, returnByValue: true });
    const exception = result.exceptionDetails?.exception?.description || result.exceptionDetails?.text;
    if (exception) throw new Error(exception);
    return result.result?.value;
  }

  async isInjected() {
    try {
      const result = await this.send('Runtime.evaluate', {
        expression: 'Boolean(window.__contentStudioChatGPTInjected)',
        returnByValue: true,
      });
      return result.result?.value === true;
    } catch {
      return false;
    }
  }
}

async function targets() {
  const response = await fetch(`http://127.0.0.1:${PORT}/json`);
  if (!response.ok) return [];
  return response.json();
}

function isChatGPT(url = '') {
  return url.startsWith('https://chatgpt.com/') || url.startsWith('https://chat.openai.com/');
}

async function refresh() {
  try {
    const pages = await targets();
    const home = pages.find((item) => item.type === 'page' && /^https:\/\/chatgpt\.com\/?(\?|$)/.test(item.url || ''));
    const thread = pages.find((item) => item.type === 'page' && /chatgpt\.com\/c\//.test(item.url || ''));
    let wantsNewChat = false;
    let lockedThread = '';
    try {
      const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
      lockedThread = String(state.chatgptThreadUrl || '');
      wantsNewChat = !lockedThread && state.newChat === true && (state.status === 'waiting' || state.status === 'running');
    } catch { /* no state */ }
    const lockedId = (lockedThread.match(/\/c\/([a-z0-9-]+)/i) || [])[1] || '';
    const lockedTab = lockedId
      ? pages.find((item) => item.type === 'page' && String(item.url || '').includes(`/c/${lockedId}`))
      : null;
    const target = lockedTab
      || (wantsNewChat && home)
      || (!wantsNewChat && thread)
      || home
      || thread
      || pages.find((item) => item.type === 'page' && isChatGPT(item.url));
    if (!target) return;
    if (wantsNewChat && /chatgpt\.com\/c\//.test(target.url || '')) {
      if (client && !client.closed && client.target.id === target.id) {
        await client.send('Page.navigate', { url: 'https://chatgpt.com/' });
        log(`URL check: left existing thread ${target.url} for a blank chat`);
        return;
      }
    }
    if (lockedThread && target.url && !String(target.url).includes(`/c/${lockedId}`)) {
      if (client && !client.closed && client.target.id === target.id) {
        await client.send('Page.navigate', { url: lockedThread });
        log(`URL check: moved to locked thread ${lockedThread}`);
        return;
      }
    }
    if (client && !client.closed && client.target.id === target.id) {
      if (!(await client.isInjected())) {
        const status = await client.inject();
        log(`Companion was missing; inject returned ${status}`);
      }
      return;
    }
    if (client && !client.closed) {
      try { client.ws.close(); } catch { /* replace stale tab */ }
      client.closed = true;
    }
    client = new CdpClient(target);
    await client.connect();
  } catch (error) {
    log(`Connection failed: ${error.message}`);
    client = null;
  }
}

log('ChatGPT browser bridge started.');
await refresh();
setInterval(refresh, 3_000);
