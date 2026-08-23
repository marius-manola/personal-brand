import { mkdir, writeFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { appendPipelineLog } from '@/lib/content-studio/pipeline-log.mjs';
import { receiveChatGPTAnswer } from '@/lib/content-studio/receive-answer.mjs';
import { canSendOnUrl, conversationIdFromUrl } from '@/lib/content-studio/chatgpt-url.mjs';
import { claimIsActive } from '@/lib/content-studio/claim.mjs';
import { isStopRequested, readSettings, readState, recordChatGPTHeartbeat, runtimePath, workerIsAlive, writeState } from '@/lib/content-studio/state';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Max-Age': '600',
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

async function receiveAnswer(jobId: string, turnId: string, text: string) {
  return receiveChatGPTAnswer({ runtimeRoot: runtimePath(), jobId, turnId, text });
}

async function appendJobLog(jobId: string, line: string) {
  await appendPipelineLog(runtimePath('jobs', jobId, 'worker.log'), line);
}

let claimQueue = Promise.resolve();

async function claimWriteJob() {
  let release!: () => void;
  const previous = claimQueue;
  claimQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const state = await readState();
    if (state.e2e) return null;
    if (isStopRequested(state)) return null;
    if (!workerIsAlive()) return null;
    if (String(state.id || '').startsWith('e2e-')) return null;
    if (state.status !== 'waiting' || !state.id || !state.chatgptTurnId || !state.chatgptPrompt) return null;
    if (state.chatgptCompletedTurnId === state.chatgptTurnId) return null;
    if (claimIsActive(state)) return null;
    const reclaim = Boolean(state.chatgptClaimedAt && !state.chatgptSentAt);
    await writeState({
      ...state,
      chatgptClaimedAt: new Date().toISOString(),
      chatgptSentAt: undefined,
      chatgptError: undefined,
      message: `ChatGPT is working on the ${state.chatgptStage || 'article'}…`,
      log: [...(state.log || []), `${reclaim ? 'reclaim' : 'claim'} turn ${state.chatgptTurnId}`].slice(-80),
    });
    await appendJobLog(state.id, `${reclaim ? 'reclaim' : 'claim'} turn ${state.chatgptTurnId}`);
    return {
      id: state.id,
      turnId: state.chatgptTurnId,
      stage: state.chatgptStage || 'write',
      prompt: state.chatgptPrompt,
      continueChat: Boolean(state.chatgptThreadUrl) || (state.newChat !== true && state.continueChat !== false),
      newChat: !state.chatgptThreadUrl && state.newChat === true,
      threadUrl: state.chatgptThreadUrl,
    };
  } finally {
    release();
  }
}

export async function GET(request: Request) {
  if (!(await isLocalRequest())) return json({ error: 'Local access only.' }, 403);
  const url = new URL(request.url);
  const plan = url.searchParams.get('plan');
  await recordChatGPTHeartbeat({
    plan: plan === 'free' || plan === 'plus' || plan === 'unknown' ? plan : undefined,
    url: url.searchParams.get('url') || undefined,
    event: url.searchParams.get('event') || 'poll',
  });
  const settings = await readSettings();
  return json({ job: await claimWriteJob(), thinkEnabled: settings.thinkEnabled === true });
}

export async function POST(request: Request) {
  try {
    if (!(await isLocalRequest())) return json({ error: 'Local access only.' }, 403);
    await recordChatGPTHeartbeat();
    const body = await request.json().catch(() => ({})) as {
      type?: string; jobId?: string; turnId?: string; text?: string; error?: string; code?: string; status?: number;
      plan?: string; url?: string; event?: string; detail?: string;
    };
    if (body.type === 'heartbeat') {
      await recordChatGPTHeartbeat({
        plan: body.plan === 'free' || body.plan === 'plus' || body.plan === 'unknown' ? body.plan : undefined,
        url: body.url, event: body.event || 'heartbeat', detail: body.detail,
      });
      return json({ ok: true });
    }

    const state = await readState();
    if (isStopRequested(state)) return json({ error: 'Job was stopped.' }, 409);
    if (!body.jobId || body.jobId !== state.id) return json({ error: 'Stale writing job.' }, 409);
    if (!body.turnId || body.turnId !== state.chatgptTurnId) return json({ error: 'This is not the active ChatGPT turn.' }, 409);

    if (body.type === 'sent') {
      if (!canSendOnUrl(state, body.url || '')) {
        return json({
          error: `Refused send on ${body.url || 'unknown url'}. First turn must be https://chatgpt.com/ ; later turns must stay on ${state.chatgptThreadUrl || 'the locked thread'}.`,
        }, 409);
      }
      const threadUrl = conversationIdFromUrl(body.url || '')
        ? String(body.url).split('?')[0]
        : state.chatgptThreadUrl;
      await writeState({
        ...state,
        chatgptSentAt: new Date().toISOString(),
        chatgptThreadUrl: threadUrl,
        message: `ChatGPT is writing the ${state.chatgptStage || 'article'}…`,
        log: [...(state.log || []), `sent turn ${body.turnId} on ${body.url || 'unknown-url'}`].slice(-80),
      });
      await appendJobLog(state.id, `sent turn ${body.turnId} on ${body.url || 'unknown-url'}`);
      return json({ ok: true });
    }

    if (body.type === 'error') {
      const status = Number(body.status) || 0;
      const detail = body.error || 'ChatGPT browser automation stopped.';
      const line = status ? `submit-error ${status} ${detail}` : `submit-error ${detail}`;
      await mkdir(runtimePath('jobs', state.id), { recursive: true });
      await writeFile(
        runtimePath('jobs', state.id, `chatgpt-${body.turnId}.error.json`),
        JSON.stringify({ status: status || 500, body: detail, at: new Date().toISOString(), turnId: body.turnId }, null, 2),
        'utf8',
      );
      await appendJobLog(state.id, line);
      await writeState({
        ...state,
        chatgptClaimedAt: undefined,
        chatgptSentAt: undefined,
        chatgptError: line,
        message: 'Submit failed. Retrying the same ChatGPT turn…',
        log: [...(state.log || []), line].slice(-80),
      });
      return json({ ok: true, retry: true });
    }

    const text = String(body.text || '').trim();
    if (body.type !== 'response' || text.length < 20) {
      return json({ error: 'A ChatGPT answer is required.' }, 400);
    }

    const received = await receiveAnswer(state.id, body.turnId, text);
    if (!received.ok) {
      await writeState({
        ...state,
        chatgptClaimedAt: undefined,
        chatgptSentAt: undefined,
        chatgptError: `submit-error ${received.status} ${received.error}`,
        message: 'Submit failed. Retrying the same ChatGPT turn…',
        log: [...(state.log || []), `submit-error ${received.status} ${received.error}`].slice(-80),
      });
      return json({ error: received.error }, received.status);
    }

    const threadUrl = conversationIdFromUrl(body.url || '')
      ? String(body.url).split('?')[0]
      : state.chatgptThreadUrl;
    await writeState({
      ...state,
      chatgptClaimedAt: undefined,
      chatgptSentAt: undefined,
      chatgptError: undefined,
      chatgptThreadUrl: threadUrl,
      newChat: threadUrl ? false : state.newChat,
      continueChat: Boolean(threadUrl) || state.continueChat,
      message: 'ChatGPT finished. Reading the answer…',
      log: [...(state.log || []), `receive turn ${body.turnId} ${text.length} characters${threadUrl ? ` on ${threadUrl}` : ''}`].slice(-80),
    });
    return json({ ok: true, bytes: received.bytes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
}
