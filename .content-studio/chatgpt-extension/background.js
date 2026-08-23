const STUDIO = 'http://127.0.0.1:3002/api/content-studio/chatgpt';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const url = sender.url || '';
  if (message?.type !== 'studio-fetch' || !(url.startsWith('https://chatgpt.com/') || url.startsWith('https://chat.openai.com/'))) {
    return false;
  }

  const method = message.method === 'POST' ? 'POST' : 'GET';
  const options = { method };
  if (method === 'POST') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = typeof message.body === 'string' ? message.body : '{}';
  }
  const params = new URLSearchParams({
    plan: message.plan || '',
    url: message.url || sender.url || '',
    event: message.event || 'poll',
  });
  const endpoint = method === 'GET' ? `${STUDIO}?${params}` : STUDIO;

  fetch(endpoint, options)
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      sendResponse({ ok: response.ok, status: response.status, data });
    })
    .catch((error) => sendResponse({ ok: false, status: 0, error: error.message }));

  return true;
});
