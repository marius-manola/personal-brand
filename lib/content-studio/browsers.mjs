import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

async function cdpTabs(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(800) });
    if (!response.ok) return [];
    const pages = await response.json();
    return (Array.isArray(pages) ? pages : [])
      .filter((page) => page.type === 'page')
      .map((page) => ({
        source: `cdp:${port}`,
        url: String(page.url || ''),
        title: String(page.title || ''),
        controllable: true,
      }));
  } catch {
    return [];
  }
}

async function appleScriptChromeTabs() {
  try {
    const { stdout } = await execFileAsync('osascript', ['-e', `
tell application "Google Chrome"
  set out to ""
  repeat with w in windows
    repeat with t in tabs of w
      set out to out & (URL of t) & "\\t" & (title of t) & linefeed
    end repeat
  end repeat
  return out
end tell
`]);
    return String(stdout || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [url, ...rest] = line.split('\t');
      return { source: 'chrome-applescript', url, title: rest.join('\t'), controllable: false };
    });
  } catch {
    return [];
  }
}

async function chatgptPlanFromCdp() {
  try {
    const response = await fetch('http://127.0.0.1:9230/json', { signal: AbortSignal.timeout(800) });
    if (!response.ok) return null;
    const pages = await response.json();
    const target = (Array.isArray(pages) ? pages : []).find((page) => page.type === 'page' && /chatgpt\.com\/c\//.test(page.url || ''));
    if (!target?.webSocketDebuggerUrl) return null;
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('plan timeout')), 4000);
      ws.addEventListener('message', (event) => {
        const packet = JSON.parse(String(event.data));
        if (packet.id !== 1) return;
        clearTimeout(timer);
        resolve(packet.result?.result?.value || null);
      });
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const text = (document.body?.innerText || '').slice(0, 2500);
            if (/\\bFree\\b/.test(text) && /Upgrade/i.test(text)) return 'free';
            if (/\\bPlus\\b|\\bPro\\b/.test(text)) return 'plus';
            return 'unknown';
          })()`,
          returnByValue: true,
        },
      }));
    });
    ws.close();
    return result === 'free' || result === 'plus' || result === 'unknown' ? result : null;
  } catch {
    return null;
  }
}

export async function listBrowsers(runtimeRoot) {
  const [studio, gemini1, gemini2, gemini3, chromeTabs, cdpPlan] = await Promise.all([
    cdpTabs(9230),
    cdpTabs(9222),
    cdpTabs(9223),
    cdpTabs(9224),
    appleScriptChromeTabs(),
    chatgptPlanFromCdp(),
  ]);
  const all = [...studio, ...gemini1, ...gemini2, ...gemini3, ...chromeTabs];
  const chatgpt = [];
  const seen = new Set();
  for (const tab of all) {
    if (!/chatgpt\.com|chat\.openai\.com/.test(tab.url)) continue;
    const key = `${tab.url}|${tab.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chatgpt.push(tab);
  }
  let heartbeatAgeMs = null;
  try {
    const record = JSON.parse(await readFile(join(runtimeRoot, 'chatgpt.json'), 'utf8'));
    heartbeatAgeMs = Date.now() - new Date(record.at).getTime();
  } catch { /* no heartbeat */ }
  const controllable = chatgpt.some((tab) => tab.controllable) || (heartbeatAgeMs != null && heartbeatAgeMs < 120_000);
  return {
    chatgptTabs: chatgpt,
    chatgptOpen: chatgpt.length > 0,
    controllable,
    heartbeatAgeMs,
    chatgptPlan: cdpPlan,
    studioProfileTabs: studio.filter((tab) => /chatgpt/.test(tab.url)),
    regularChromeTabs: chromeTabs.filter((tab) => /chatgpt/.test(tab.url)),
  };
}
