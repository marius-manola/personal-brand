export function conversationIdFromUrl(url = '') {
  const match = String(url).match(/https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/c\/([a-z0-9-]+)/i);
  return match ? match[1] : '';
}

export function isChatGPTHome(url = '') {
  return /^https?:\/\/(chatgpt\.com|chat\.openai\.com)\/?(?:\?|$)/i.test(String(url));
}

export function sameConversation(left, right) {
  const leftId = conversationIdFromUrl(left);
  const rightId = conversationIdFromUrl(right);
  return Boolean(leftId && leftId === rightId);
}

export function canSendOnUrl(state, pageUrl) {
  const pageId = conversationIdFromUrl(pageUrl);
  const lockedId = conversationIdFromUrl(state?.chatgptThreadUrl);
  if (lockedId) return pageId === lockedId;
  if (state?.newChat) return !pageId && isChatGPTHome(pageUrl);
  return true;
}
