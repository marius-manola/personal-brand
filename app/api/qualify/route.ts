import { NextResponse } from 'next/server';
import {
  calendarUrl,
  projectChoices,
  signals,
  teamSizeChoices,
  usageChoices,
  timelineChoices,
  type Choice,
} from '@/app/data/learn-ai';

// Intake endpoint for /learn-ai.
//
// Everyone who submits gets the calendar — this collects context before the call
// rather than gating it. The answers still come to Telegram, flagged strong or thin
// so you know whether to prep. Nothing here can turn anyone away.
//
// Leads arrive as a Telegram push rather than email: free with no monthly cap,
// no spam folder, no sender domain to verify, and no npm dependency — the Bot
// API is one fetch. Delivery is isolated in notifyLead() below, so switching to
// email later means editing that one function and nothing else.
//
// Required env:
//   TELEGRAM_BOT_TOKEN  from @BotFather
//   TELEGRAM_CHAT_ID    your own chat id

interface Lead {
  name: string;
  email: string;
  project: string;
  teamSize: string;
  usage: string;
  timeline: string;
  detail: string;
}

const MAX = { name: 120, email: 200, detail: 2000 } as const;

// Telegram hard-caps a message at 4096 characters. `detail` is already clamped
// to 2000 and the labels are short, so we stay well inside it.
const TELEGRAM_MAX_MESSAGE = 4096;

const labelFor = (choices: Choice[], value: string) =>
  choices.find((c) => c.value === value)?.label ?? value;

const isChoice = (choices: Choice[], value: string) =>
  choices.some((choice) => choice.value === value);

function readField(body: Record<string, unknown>, key: string, max: number): string {
  const raw = body[key];
  return typeof raw === 'string' ? raw.trim().slice(0, max) : '';
}

// Deliberately loose: this only needs to stop typos and obvious junk, and a
// stricter pattern would reject valid addresses.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Labels the notification only — it decides nothing about what the visitor sees.
function looksStrong(lead: Lead): boolean {
  if (lead.timeline === signals.weakTimeline) return false;
  if (lead.detail.length < signals.thinDetailLength) return false;
  return true;
}

// Telegram's HTML parse mode only needs these three escaped. Without it, a lead
// who types "<3" or "a & b" would break the message and the send would 400.
const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function composeMessage(lead: Lead, strong: boolean): string {
  const rows: Array<[string, string]> = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Need', labelFor(projectChoices, lead.project)],
    ['Team size', labelFor(teamSizeChoices, lead.teamSize)],
    ['Current AI use', labelFor(usageChoices, lead.usage)],
    ['Timeline', labelFor(timelineChoices, lead.timeline)],
  ];

  const message = [
    strong ? '<b>✅ Strong lead</b>' : '<b>⚠️ Thin lead — read before you prep</b>',
    '',
    ...rows.map(([key, value]) => `<b>${key}:</b> ${escapeHtml(value)}`),
    '',
    '<b>What they want to change or build</b>',
    escapeHtml(lead.detail),
  ].join('\n');

  return message.slice(0, TELEGRAM_MAX_MESSAGE);
}

// Overridable so the endpoint can be aimed at a local mock while testing.
const telegramApiBase = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';

async function notifyLead(lead: Lead, strong: boolean): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set — cannot deliver the lead',
    );
  }

  const response = await fetch(`${telegramApiBase}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: composeMessage(lead, strong),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    // Without this, a hung Telegram request would hold the visitor's submit open.
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Telegram responded ${response.status}: ${detail.slice(0, 200)}`);
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 });
  }

  // Honeypot: a hidden field real people never fill in. Accept silently so bots
  // don't learn they were caught, but send nothing.
  if (readField(body, 'company', 200)) {
    return NextResponse.json({ calendarUrl: null, delivered: true }, { status: 200 });
  }

  const lead: Lead = {
    name: readField(body, 'name', MAX.name),
    email: readField(body, 'email', MAX.email),
    project: readField(body, 'project', 40),
    teamSize: readField(body, 'teamSize', 40),
    usage: readField(body, 'usage', 40),
    timeline: readField(body, 'timeline', 40),
    detail: readField(body, 'detail', MAX.detail),
  };

  if (
    !lead.name
    || !looksLikeEmail(lead.email)
    || lead.detail.length < 20
    || !isChoice(projectChoices, lead.project)
    || !isChoice(teamSizeChoices, lead.teamSize)
    || !isChoice(usageChoices, lead.usage)
    || !isChoice(timelineChoices, lead.timeline)
  ) {
    return NextResponse.json(
      { error: 'Please complete each question before opening the calendar.' },
      { status: 400 },
    );
  }

  let delivered = true;
  try {
    await notifyLead(lead, looksStrong(lead));
  } catch (error) {
    delivered = false;
    console.error('[qualify] notification failed:', error);
  }

  // The calendar goes out either way. A failed notification is my problem, not the
  // visitor's — and cal.com still tells me who booked. `delivered` lets the form
  // ask them to bring their answers to the call so nothing is silently lost.
  return NextResponse.json({ calendarUrl, delivered }, { status: 200 });
}
