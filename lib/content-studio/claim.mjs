export const CLAIM_SEND_MS = 45_000;
export const CLAIM_ANSWER_MS = 8 * 60_000;

export function claimIsActive(state, now = Date.now()) {
  if (!state?.chatgptClaimedAt) return false;
  const claimedAt = Date.parse(state.chatgptClaimedAt);
  if (!Number.isFinite(claimedAt)) return false;
  if (state.chatgptSentAt) {
    const sentAt = Date.parse(state.chatgptSentAt);
    return Number.isFinite(sentAt) && now - sentAt < CLAIM_ANSWER_MS;
  }
  return now - claimedAt < CLAIM_SEND_MS;
}
