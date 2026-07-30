// /learn-ai content module.
//
// Follows the app/data/home.ts convention: every word of copy, every price, and
// every link lives here as typed data so the page component stays layout-only.
// When rates go up, edit `packages` here and nothing else.
//
// This page is deliberately terse — a standalone landing page, not an essay.
// Keep every string short enough to scan; that density is the design.

// SERVER-ONLY. The whole point of the screener is that this isn't in the page
// source, so never import it into a client component — app/api/qualify/route.ts
// hands it back only after a submission passes. (A determined visitor can still
// find a public cal.com link; this filters intent, it isn't a lock.)
export const calendarUrl = 'https://cal.com/mariusmanola/30min';

// Shown to a visitor only as a fallback if the Telegram notification fails, so
// a lead always has some way to reach you. Not a delivery target.
export const contactEmail = process.env.LEAD_CONTACT_EMAIL || 'mariusmanola@gmail.com';

// Shown in the hero badge and the closing panel. Set to 0 to hide both.
export const spotsOpen = 5;

// The word is "consulting", first line, on purpose. Coaching, mentoring and training
// all invite a discount in the reader's head; consulting doesn't.
//
// No eyebrow above it: a label over a heading steals the first line and says nothing.
//
// No em dashes anywhere in this file. Sentence length still varies, but nothing
// punches for the sake of punching.
export const hero = {
  title: 'Advanced AI consulting, one to one, on your actual work.',
  // Shows the multiplier instead of claiming it. "Advanced" is an adjective anyone
  // can type; product managers who went from specs to shipping is evidence.
  lead:
    'Most people use these tools at a fraction of what they do. My job is to take you to the other end of that, on your own work, one to one. I’ve done it with product managers who went from writing specs to building and shipping the product themselves, and automating half the process around it. AI multiplies whatever you already know, so the more skill you walk in with, the more there is to multiply.',
  ctaLabel: 'See if it fits',
  ctaNote: 'Four questions. One minute.',
};


// Proof as a ledger, not a metrics band.
//
// This replaced two separate sections — a big-number strip and a list of links —
// which stated the same figures twice and made the page top-heavy with the exact
// "big number, small label, supporting stats" template every landing page reaches
// for. One ruled table: the number, what it counts, and where to check it.
//
// `value` animates when present; rows without one are credentials, not counts.
export interface LedgerRow {
  value?: number;
  suffix?: string;
  /** What the number counts, or the claim itself when there's no number. */
  text: string;
  href?: string;
  linkLabel?: string;
}

export const ledger = {
  label: 'why me',
  intro: 'Check any of it.',
  rows: [
    {
      value: 109753,
      text: 'students taught on Udemy, across 4 courses and 23,929 reviews',
      href: 'https://www.udemy.com/user/marius-manola/',
      linkLabel: 'profile',
    },
    {
      value: 39400,
      text: 'members in the Claude Code group I run',
      href: 'https://www.facebook.com/groups/claudecode',
      linkLabel: 'facebook',
    },
    {
      value: 10000,
      suffix: '+',
      text: 'people using NotClass, an app I built and shipped',
      href: 'https://www.linkedin.com/posts/marius-manolachi_its-just-beautiful-seeing-a-handful-of-activity-7455595265333346304-XO9x',
      linkLabel: 'the post',
    },
    {
      text: 'TryUncle, what I’m building now. An AI agent that watches your screen and annotates it live',
      href: 'https://tryuncle.com',
      linkLabel: 'tryuncle',
    },
    {
      text: 'Invited to speak at the OECD on AI and education',
      href: 'https://www.linkedin.com/posts/marius-manolachi_oecd-activity-7138621139106381824-73bf',
      linkLabel: 'the talk',
    },
    {
      text: 'Entrepreneur First, The Bridge. Two months in a castle with 35 technical founders',
      href: 'https://www.joinef.com/',
      linkLabel: 'ef',
    },
  ] as LedgerRow[],
};

// One testimonial, framed as the LinkedIn post it actually is.
//
// Every field is verbatim from the post — including the reaction and repost counts.
// Nothing is dressed up: no invented engagement, no fake verification badge, and
// `href` points at the public post so the whole thing is checkable.
export interface Testimonial {
  quote: string;
  name: string;
  /** Their own LinkedIn headline, as written. */
  headline: string;
  /** Monogram stand-in — using someone's photo without asking isn't ours to do. */
  initials: string;
  timeAgo: string;
  reactions: number;
  reposts: number;
  href: string;
}

export const testimonial: Testimonial = {
  quote:
    'I have attended a ChatGPT workshop at Orange, led by the talented Marius Manolachi, an AI expert, and author of Udemy courses with millions of views. Marius captivated the audience with his deep knowledge and passion for AI. He shared valuable insights & HOW-TO write ChatGPT prompts, shedding light on its applications with real examples.',
  name: 'Natalia Melniciuc, PhD, PMP',
  headline: 'IT Delivery Manager | Build strong teams with agile mindset',
  initials: 'NM',
  timeAgo: '2y',
  reactions: 24,
  reposts: 1,
  href: 'https://www.linkedin.com/posts/natalia-melniciuc-phd_continuouslearning-professionaldevelopment-ugcPost-7222195991079231489-fwGg',
};

// Describes people, not services. A list of tasks makes a reader work out whether
// their task counts; a list of people lets them find themselves in one line and stop
// reading. The screener's first question reuses these five in the same order, so the
// page and the form agree.
export const offer = {
  label: 'who this is for',
  intro:
    'It’s consulting. We meet over video, an hour at a time, and we work on your actual work rather than on exercises. Claude Code, Codex, ChatGPT, whatever you’re using.',
  after:
    'You share your screen, I share mine, and you do the typing. I explain what I’m doing as I do it, because the point is that you can do it without me afterwards.',
};

// Five kinds of person, in the same order as the screener's first question.
export const youGet: string[] = [
  'People who want to get into this properly and don’t know where to start.',
  'People stuck on one specific problem, right now.',
  'People who want to build and code with it, not just chat with it.',
  'People who’ve been using it a while and it keeps going wrong.',
  'People who already use it daily and want to be genuinely good at it.',
];

export interface Package {
  /** "One session" carries the hours, so there's no separate hours field. */
  name: string;
  price: string;
  rate: string;
}

// "Rates", not "packages" — packages implies a funnel, rates is what someone who
// does this work charges. No tier is flagged as recommended; `ratesNote` below does
// that job in a sentence instead of a badge.
export const packages: Package[] = [
  { name: 'One session', price: '$300', rate: '$300 / hour' },
  { name: 'Four sessions', price: '$1,000', rate: '$250 / hour' },
  { name: 'Sixteen sessions', price: '$3,200', rate: '$200 / hour' },
];

export const ratesNote = 'Most people start with one and go from there.';

// One sentence rather than a checklist of deliverables. Both halves are promises you
// have to keep, so keep them modest.
export const includesNote =
  'Every session comes with a short written recap and your next steps, and you can ask me questions between sessions.';

export const guarantee =
  'If the first hour isn’t worth what you paid, I refund the rest. No forms, no argument.';

// Deliberately vague on purpose: a published hourly rate would anchor a company at
// individual rates. Training a team is different work and gets priced on the call.
export const teamsNote = 'Teams are priced differently. Tell me in the form.';

// Only the disqualifiers now. Section 3 already says who this is for, so a "yes, if"
// column opposite it was the same information twice.
export const fit = {
  label: 'probably not a fit',
  notFor: [
    'If you want it built for you rather than with you. That’s an agency, not me.',
    'If you already ship with these tools daily. You’d be paying me for things you’d work out in a week.',
    'If you want a certificate rather than a working thing.',
  ],
  // Saying the limit out loud buys more trust than another claim would.
  caveat:
    'And to be straight about it: I’m a builder and a teacher, not a senior systems engineer. If what you need is hardened infrastructure or anything regulated, I’ll say so on the call and point you somewhere better.',
};

export const prep = {
  label: 'before the call',
  items: [
    'What you want to exist, in two sentences.',
    'What has stopped you until now.',
    'What working would look like.',
  ],
};

// ---------------------------------------------------------------------------
// Screener
// ---------------------------------------------------------------------------

export interface Choice {
  value: string;
  label: string;
}

// Values are the contract between the form and app/api/qualify/route.ts —
// changing a `value` means changing the gates below too.
export const projectChoices: Choice[] = [
  { value: 'start', label: 'I want to get into this and don’t know where to start' },
  { value: 'stuck', label: 'I’m stuck on a specific problem' },
  { value: 'build', label: 'I want to build and code with it' },
  { value: 'wrong', label: 'I use it already and it keeps going wrong' },
  { value: 'good', label: 'I use it daily and want to be really good at it' },
];

export const technicalChoices: Choice[] = [
  { value: 'none', label: 'I’ve never written code' },
  { value: 'tools', label: 'I use AI tools but I don’t code' },
  { value: 'read', label: 'I can read code and edit it' },
  { value: 'dev', label: 'I write code' },
];

export const timelineChoices: Choice[] = [
  { value: 'now', label: 'This week' },
  { value: 'month', label: 'Within a month' },
  { value: 'someday', label: 'No particular timeline' },
];

// Everyone gets the calendar, so nothing here blocks anyone. These only decide whether
// the Telegram message is flagged strong or thin, so you know whether to prep.
//
// No weak project value any more: every option in projectChoices is someone worth
// talking to, which is the point of describing people instead of tasks.
export const signals = {
  weakTimeline: 'someday',
  thinDetailLength: 30,
};

export const qualifier = {
  label: 'apply',
  heading: 'See if it fits',
  intro:
    'Four questions. One minute. Then my calendar opens right here, and I’ll have read every answer before we meet.',
  fields: {
    name: 'Your name',
    email: 'Email',
    project: 'Which one sounds most like you?',
    technical: 'Where are you today?',
    timeline: 'When do you want to start?',
    detail: 'What do you want to exist, and what’s stopped you so far?',
    detailHint: 'Be specific. This is the answer I actually read before the call.',
  },
  submitLabel: 'Get my calendar',
  submitting: 'One second...',
  booked: {
    heading: 'Here’s my calendar',
    body: 'Pick a time, and bring the three things above.',
    ctaLabel: 'Open my calendar',
    undelivered: 'Your answers didn’t reach me. Bring them to the call.',
  },
  error: {
    heading: 'That didn’t send',
    body: 'Something broke on my end. Email me and I’ll pick it up:',
  },
};

// ---------------------------------------------------------------------------
// Photo strip
// ---------------------------------------------------------------------------
//
// One horizontal band of tilted, rounded photos sitting under the hero. The row is
// deliberately much wider than the page frame and overflows past it on both sides,
// so the photos sit on the page background beyond the border and read as a strip
// continuing off-screen. Eight entries keeps it wider than the viewport on typical
// displays; adding more only extends the bleed.
//
// aria-hidden: the receipts list carries every one of these claims in text, so the
// band is visual reinforcement rather than the only place proof appears.
//
// Real screenshots in public/proof/ (JPEG, 820px on the long edge). Each is a button
// that opens the uncropped image, since the strip crops to 4:3 anchored to the top —
// so the part carrying the proof survives the crop. Swap one by overwriting the file.
//
// `rotate` is the tilt in degrees; alternating signs is what makes the row look
// hand-laid instead of stamped.
export interface ProofPhoto {
  src: string;
  alt: string;
  rotate: number;
}

export const proofPhotos: ProofPhoto[] = [
  {
    src: '/proof/udemy-profile.jpg',
    alt: 'Udemy instructor profile showing 109,753 learners and 23,929 reviews',
    rotate: -2.5,
  },
  {
    src: '/proof/community.jpg',
    alt: 'Claude Code learning group on Facebook, 39.4K members',
    rotate: 2,
  },
  {
    src: '/proof/testimonial-natalia.jpg',
    alt: 'LinkedIn post by Natalia Melniciuc about the AI workshop at Orange',
    rotate: -1.5,
  },
  {
    src: '/proof/oecd.jpg',
    alt: 'Speaking at the OECD',
    rotate: 2.5,
  },
  {
    src: '/proof/testimonial-olga.jpg',
    alt: 'LinkedIn post by Olga Surugiu, CEO of Orange Moldova',
    rotate: -2,
  },
  {
    src: '/proof/notclass.jpg',
    alt: 'NotClass user testimonials and screenshots',
    rotate: 1.5,
  },
  {
    src: '/proof/udemy-course.jpg',
    alt: 'ChatGPT prompt writing course with over 50,000 students',
    rotate: -1.5,
  },
  {
    src: '/proof/entrepreneur-first.jpg',
    alt: 'Entrepreneur First, The Bridge — with 35 technical founders',
    rotate: 2,
  },
];

export interface QuietLink {
  label: string;
  href: string;
  external?: boolean;
}

// Deliberately quiet: the page has exactly one loud action. Since this page hides
// the site nav, `home` is the only way back — keep it in the list.
export const quietLinks: QuietLink[] = [
  { label: 'home', href: '/' },
  { label: 'free courses', href: 'https://www.udemy.com/user/marius-manola/', external: true },
  { label: 'tryuncle', href: 'https://tryuncle.com', external: true },
];
