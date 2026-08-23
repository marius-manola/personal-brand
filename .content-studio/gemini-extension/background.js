const STUDIO = 'http://127.0.0.1:3002/api/content-studio/gemini';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'studio-fetch' || !sender.url?.startsWith('https://gemini.google.com/')) {
    return false;
  }

  const method = message.method === 'POST' ? 'POST' : 'GET';
  const options = { method };
  if (method === 'POST') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = typeof message.body === 'string' ? message.body : '{}';
  }

  const accountId = ['1', '2', '3'].includes(message.accountId) ? message.accountId : '1';
  fetch(`${STUDIO}?accountId=${accountId}`, options)
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      sendResponse({ ok: response.ok, status: response.status, data });
    })
    .catch((error) => sendResponse({ ok: false, status: 0, error: error.message }));

  return true;
});
