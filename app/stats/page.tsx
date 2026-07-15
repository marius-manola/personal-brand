import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import Copyright from '@/app/components/Copyright';
import { getAllEssays } from '@/lib/server/essays.server';

type Term = { term: string; weight?: number };

type Axis = {
  name: string; // e.g. 'I/E'
  left: string; // 'I'
  right: string; // 'E'
  leftLabel: string; // 'Introversion'
  rightLabel: string;
  leftWords: Term[];
  rightWords: Term[];
};

type AxisScore = {
  name: string;
  left: string;
  right: string;
  leftLabel: string;
  rightLabel: string;
  letter: string; // winning letter
  leftShare: number; // 0..1, smoothed
  rightShare: number; // 0..1, smoothed (leftShare + rightShare === 1)
  margin: number; // |leftShare - rightShare|
  totalScore: number; // weighted evidence behind this axis
  confidence: number; // margin * evidence, 0..1
};

// --- Scoring configuration -------------------------------------------------
// Smoothing + evidence-saturation constants.
const ALPHA = 1; // Laplace smoothing per side
const K = 12; // evidence half-saturation (weighted hits)

// Escape regex metachars, allow flexible internal whitespace, wrap in \b…\b.
function compileTerm(term: string): RegExp {
  const escaped = term
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
}

// Weighted, word-boundary-aware match count.
function countMatches(text: string, terms: Term[]): number {
  return terms.reduce((acc, { term, weight = 1 }) => {
    const matches = text.match(compileTerm(term));
    return acc + (matches ? matches.length * weight : 0);
  }, 0);
}

function scoreAxis(text: string, axis: Axis): AxisScore {
  const leftScore = countMatches(text, axis.leftWords);
  const rightScore = countMatches(text, axis.rightWords);
  const total = leftScore + rightScore;

  // Smoothed shares — never divides by zero, never reports a spurious 100%.
  const leftShare = (leftScore + ALPHA) / (total + 2 * ALPHA);
  const rightShare = 1 - leftShare;

  const margin = Math.abs(leftShare - rightShare);
  const evidence = total / (total + K); // saturates toward 1
  const confidence = margin * evidence; // needs both lopsidedness AND evidence

  return {
    name: axis.name,
    left: axis.left,
    right: axis.right,
    leftLabel: axis.leftLabel,
    rightLabel: axis.rightLabel,
    letter: leftShare >= rightShare ? axis.left : axis.right,
    leftShare,
    rightShare,
    margin,
    totalScore: total,
    confidence,
  };
}

// --- Word / phrase banks, grounded in the author's actual vocabulary -------

// I / E — Introversion vs Extraversion
const I_WORDS: Term[] = [
  { term: 'writing', weight: 1 },
  { term: 'for myself', weight: 3 },
  { term: 'to myself', weight: 2 },
  { term: 'thinking', weight: 1 },
  { term: 'think through', weight: 2 },
  { term: 'reflect', weight: 2 },
  { term: 'reflections', weight: 2 },
  { term: 'contemplating', weight: 2 },
  { term: 'alone', weight: 2 },
  { term: 'my own thinking', weight: 3 },
  { term: 'my mind', weight: 2 },
  { term: 'inner', weight: 2 },
  { term: 'introspect', weight: 2 },
  { term: 'question myself', weight: 2 },
  { term: 'i realise', weight: 1 },
  { term: 'i realised', weight: 1 },
  { term: 'i wondered', weight: 2 },
  { term: 'in my head', weight: 2 },
  { term: 'clear my mind', weight: 2 },
  { term: 'quiet', weight: 1 },
];
// NOTE: deliberately excludes generic topic-nouns this author uses when writing
// *about* humanity (people, others, everyone, society, share, talk) — those track
// subject matter, not his own social energy, and swamped the axis with noise.
const E_WORDS: Term[] = [
  { term: 'community', weight: 2 },
  { term: 'social hierarchy', weight: 2 },
  { term: 'social validation', weight: 2 },
  { term: 'audience', weight: 2 },
  { term: 'team', weight: 1 },
  { term: 'teams', weight: 1 },
  { term: 'hackathon', weight: 3 },
  { term: 'hackathons', weight: 3 },
  { term: 'meeting new people', weight: 3 },
  { term: 'new people', weight: 2 },
  { term: 'friends', weight: 2 },
  { term: 'out loud', weight: 2 },
  { term: 'in person', weight: 2 },
  { term: 'what others think', weight: 2 },
  { term: 'what people think', weight: 2 },
  { term: 'crowd', weight: 2 },
  { term: 'party', weight: 2 },
  { term: 'network', weight: 1 },
  { term: 'collaborate', weight: 2 },
  { term: 'extrovert', weight: 3 },
];

// N / S — Intuition vs Sensing
const N_WORDS: Term[] = [
  { term: 'abstraction', weight: 3 },
  { term: 'abstract', weight: 2 },
  { term: 'meta', weight: 2 },
  { term: 'systems', weight: 2 },
  { term: 'system', weight: 1 },
  { term: 'framework', weight: 2 },
  { term: 'frameworks', weight: 2 },
  { term: 'model', weight: 1 },
  { term: 'models', weight: 1 },
  { term: 'internal models', weight: 3 },
  { term: 'meaning', weight: 2 },
  { term: 'triangulation', weight: 3 },
  { term: 'intuition', weight: 2 },
  { term: 'the future', weight: 2 },
  { term: 'post-agi', weight: 3 },
  { term: 'possibilities', weight: 2 },
  { term: 'imagine', weight: 2 },
  { term: 'vision', weight: 2 },
  { term: 'patterns', weight: 2 },
  { term: 'connect the dots', weight: 3 },
  { term: 'understanding', weight: 1 },
  { term: 'why the wrong way is wrong', weight: 3 },
  { term: 'level of abstraction', weight: 3 },
  { term: 'big picture', weight: 2 },
  { term: 'larger timescales', weight: 3 },
];
const S_WORDS: Term[] = [
  { term: 'routine', weight: 2 },
  { term: 'daily', weight: 1 },
  { term: 'every day', weight: 1 },
  { term: 'steps', weight: 1 },
  { term: 'step by step', weight: 2 },
  { term: 'practical', weight: 2 },
  { term: 'concrete', weight: 2 },
  { term: 'details', weight: 1 },
  { term: 'into the weeds', weight: 3 },
  { term: 'hands-on', weight: 2 },
  { term: 'in practice', weight: 2 },
  { term: 'real world', weight: 1 },
  { term: 'facts', weight: 1 },
  { term: 'data', weight: 1 },
  { term: 'observations', weight: 2 },
  { term: 'tangible', weight: 2 },
  { term: 'guardrails', weight: 2 },
  { term: 'ship', weight: 1 },
  { term: 'build', weight: 1 },
];

// T / F — Thinking vs Feeling
const T_WORDS: Term[] = [
  { term: 'logic', weight: 2 },
  { term: 'logical', weight: 2 },
  { term: 'reason', weight: 1 },
  { term: 'reasoning', weight: 2 },
  { term: 'first principles', weight: 3 },
  { term: 'fundamental components', weight: 3 },
  { term: 'decompose', weight: 3 },
  { term: 'analysis', weight: 2 },
  { term: 'structure', weight: 1 },
  { term: 'optimise', weight: 2 },
  { term: 'optimising', weight: 2 },
  { term: 'optimal', weight: 2 },
  { term: 'efficient', weight: 2 },
  { term: 'leverage', weight: 2 },
  { term: 'tradeoff', weight: 2 },
  { term: 'tradeoffs', weight: 2 },
  { term: 'define', weight: 1 },
  { term: 'parameters', weight: 2 },
  { term: 'business model', weight: 1 },
  { term: 'design', weight: 1 },
  { term: 'mechanism', weight: 2 },
];
const F_WORDS: Term[] = [
  { term: 'meaning', weight: 2 },
  { term: 'meaningful', weight: 2 },
  { term: 'purpose', weight: 3 },
  { term: 'obsessed', weight: 3 },
  { term: 'obsession', weight: 3 },
  { term: 'care', weight: 1 },
  { term: 'i really care', weight: 3 },
  { term: 'love', weight: 2 },
  { term: 'connection', weight: 2 },
  { term: 'fulfilling', weight: 2 },
  { term: 'fulfils', weight: 2 },
  { term: 'authentic', weight: 3 },
  { term: 'authenticity', weight: 3 },
  { term: 'insecure', weight: 2 },
  { term: 'insecurity', weight: 2 },
  { term: 'grateful', weight: 2 },
  { term: 'values', weight: 1 },
  { term: 'emotions', weight: 2 },
  { term: 'feel', weight: 1 },
  { term: 'i feel', weight: 2 },
  { term: 'prove myself', weight: 2 },
  { term: 'missionary', weight: 2 },
  { term: 'soul', weight: 2 },
];

// J / P — Judging vs Perceiving
const J_WORDS: Term[] = [
  { term: 'plan', weight: 1 },
  { term: 'planning', weight: 1 },
  { term: 'blueprint', weight: 3 },
  { term: 'goal', weight: 1 },
  { term: 'goals', weight: 1 },
  { term: 'discipline', weight: 2 },
  { term: 'disciplined', weight: 2 },
  { term: 'consistent', weight: 2 },
  { term: 'consistency', weight: 2 },
  { term: 'structure', weight: 1 },
  { term: 'map out', weight: 2 },
  { term: 'optimal order', weight: 3 },
  { term: 'the right order', weight: 2 },
  { term: 'steps figured out', weight: 3 },
  { term: 'kpi', weight: 2 },
  { term: 'stepping stones', weight: 2 },
  { term: 'financial hygiene', weight: 2 },
  { term: 'core steps', weight: 2 },
];
const P_WORDS: Term[] = [
  { term: 'uncertainty', weight: 3 },
  { term: 'unknown', weight: 2 },
  { term: 'into the unknown', weight: 3 },
  { term: 'just start', weight: 3 },
  { term: 'do the thing', weight: 3 },
  { term: 'adapt', weight: 2 },
  { term: 'adaptable', weight: 2 },
  { term: 'serendipity', weight: 3 },
  { term: 'emergent', weight: 2 },
  { term: 'emerges', weight: 2 },
  { term: 'explore', weight: 2 },
  { term: 'seasons', weight: 2 },
  { term: 'go all-in', weight: 2 },
  { term: "don't overthink", weight: 3 },
  { term: 'vague vision', weight: 3 },
  { term: 'throw yourself', weight: 3 },
  { term: 'flexible', weight: 2 },
  { term: 'improvise', weight: 2 },
  { term: 'let the universe', weight: 2 },
  { term: 'perpetual learner', weight: 2 },
  { term: 'change your behaviour', weight: 2 },
  { term: 'confused', weight: 1 },
  { term: 'doubt', weight: 1 },
];

const mbtiAxes: Axis[] = [
  {
    name: 'I/E', left: 'I', right: 'E',
    leftLabel: 'Introversion', rightLabel: 'Extraversion',
    leftWords: I_WORDS, rightWords: E_WORDS,
  },
  {
    name: 'N/S', left: 'N', right: 'S',
    leftLabel: 'Intuition', rightLabel: 'Sensing',
    leftWords: N_WORDS, rightWords: S_WORDS,
  },
  {
    name: 'T/F', left: 'T', right: 'F',
    leftLabel: 'Thinking', rightLabel: 'Feeling',
    leftWords: T_WORDS, rightWords: F_WORDS,
  },
  {
    name: 'J/P', left: 'J', right: 'P',
    leftLabel: 'Judging', rightLabel: 'Perceiving',
    leftWords: J_WORDS, rightWords: P_WORDS,
  },
];

// Cognitive-function stack, calibrated by self-report: Ti leads, Fi has stepped
// back from the driver's seat to fuel. Ne is the shared engine, Se the chased inferior.
const functionStack = [
  {
    code: 'Ti',
    name: 'Introverted Thinking',
    role: 'Dominant — calibrated',
    note: 'Judges by internal consistency — "is it internally consistent?" over "is it true to what matters?" Builds first-principles frameworks and defines terms before proceeding. Self-report puts this in the driver’s seat.',
  },
  {
    code: 'Ne',
    name: 'Extraverted Intuition',
    role: 'Auxiliary — the engine',
    note: 'Analogises relentlessly across domains — education ↔ startups ↔ transformers ↔ circuits ↔ Florence. Opens more loops than it closes.',
  },
  {
    code: 'Fi',
    name: 'Introverted Feeling',
    role: 'Tertiary — formerly louder',
    note: 'A private value compass — "only my rules for my life," an inability to work on anything not obsessed over. It used to lead ("it mattered to me first"); now it fuels rather than steers.',
  },
  {
    code: 'Se',
    name: 'Extraverted Sensing',
    role: 'Inferior — chased, not owned',
    note: 'Shows up as craving, not strength — hackathons, thrill, "feel alive in the moment." Raw experience as an escape from over-abstraction.',
  },
];

function pct(x: number): number {
  return Math.round(x * 100);
}

function confidenceLabel(c: number): 'strong' | 'moderate' | 'weak' {
  if (c >= 0.35) return 'strong';
  if (c >= 0.15) return 'moderate';
  return 'weak';
}

function topEssayTitles(
  entries: Array<{ title: string; text: string }>,
  terms: Term[],
  limit = 3
): string[] {
  return entries
    .map((entry) => ({ title: entry.title, score: countMatches(entry.text, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.title);
}

export default async function PlayerPage() {
  const essays = await getAllEssays();
  const entries = essays.map((essay) => ({
    title: essay.metadata.title,
    text: `${essay.metadata.title} ${essay.content}`.toLowerCase(),
  }));
  const corpus = entries.map((entry) => entry.text).join(' ');

  // Score every axis — this drives both the type string and the meters.
  const axisScores = mbtiAxes.map((axis) => scoreAxis(corpus, axis));
  const mbtiGuess = axisScores.map((a) => a.letter).join('');

  const tfAxis = axisScores.find((a) => a.name === 'T/F')!;

  // --- Self-report calibration on the borderline axes -----------------------
  // The scan can only see subject matter, not decision mechanism. A short
  // forced-choice test was run on the three axes it was least sure of (T/F, J/P,
  // I/E) to break the ties. Results below; the T/F tie flipped to Thinking, which
  // resolves the essay scan's INFP to INTP.
  const calibratedType = 'INTP';
  const calibration = [
    {
      axis: 'T/F',
      scan: 'F',
      selfReport: 'T',
      flipped: true,
      note: 'Both judgment items came back Thinking — "is it internally consistent?" over "is it true to what matters?" The essays scan as F because their subject is meaning, purpose and obsession; the decision mechanism underneath is logical coherence.',
    },
    {
      axis: 'J/P',
      scan: 'P',
      selfReport: 'P',
      flipped: false,
      note: '"Direction, then improvise." Locking steps early or closing options feels constraining — the scan was right.',
    },
    {
      axis: 'I/E',
      scan: 'I',
      selfReport: 'I',
      flipped: false,
      note: 'Recharges alone and does the real thinking in solitude, even after loving the social buzz — introversion holds over the extraverted streak the essays hint at.',
    },
  ];

  const systemsEvidence = topEssayTitles(entries, N_WORDS);
  const agencyEvidence = topEssayTitles(entries, [
    { term: 'agency' }, { term: 'freedom' }, { term: 'intrinsic' }, { term: 'autonomy' }, { term: 'authentic' },
  ]);
  const uncertaintyEvidence = topEssayTitles(entries, P_WORDS);
  const writingEvidence = topEssayTitles(entries, [
    { term: 'writing' }, { term: 'thinking' }, { term: 'essay' }, { term: 'feedback' }, { term: 'understanding' },
  ]);
  const executionEvidence = topEssayTitles(entries, [
    { term: 'startup' }, { term: 'build' }, { term: 'ship' }, { term: 'founder' }, { term: 'leverage' },
  ]);
  const feelingEvidence = topEssayTitles(entries, F_WORDS);

  return (
    <>
      <MobileNavigation />

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main">
            <div className="page-stack">
              <header className="page-header">
                <h1 className="page-title">Profile</h1>
                <p className="page-subtitle">derived from {essays.length} essays</p>
              </header>

              <section className="space-y-14">
                {/* ---- MBTI verdict + per-axis meters ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">MBTI</h2>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-[2.6rem] leading-none font-semibold tracking-tight">{calibratedType}</span>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      essays alone scan {mbtiGuess}
                    </span>
                  </div>
                  <p className="page-body text-[1.08rem] mb-6">
                    A theory-building explorer who models the world — and himself — as systems, then refuses to
                    commit to a fixed path. Intuition is the loudest signal by far. The essays on their own scan
                    as {mbtiGuess}: their subject is drenched in meaning, purpose and obsession, which reads as
                    Feeling. But that axis is about <em>how</em> decisions get made, not what they&apos;re about —
                    and a self-report test came back Thinking. Calibrated, the type is {calibratedType}. Logic
                    leads now; the values are the fuel.
                  </p>

                  <div className="space-y-3">
                    {axisScores.map((a) => {
                      const winnerShare = Math.max(a.leftShare, a.rightShare);
                      const conf = confidenceLabel(a.confidence);
                      const leftWins = a.letter === a.left;
                      return (
                        <div key={a.name} className="flex items-center gap-3 text-sm">
                          <span className="w-16 shrink-0 text-[hsl(var(--muted-foreground))]">
                            {a.left}<span className="opacity-40"> / </span>{a.right}
                          </span>
                          <div className="relative h-1.5 flex-1 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[hsl(var(--background))] opacity-60" />
                            <div
                              className="absolute top-0 h-full rounded-full bg-[hsl(var(--foreground))]"
                              style={{
                                left: leftWins ? `${(1 - winnerShare) * 100}%` : '50%',
                                width: `${(winnerShare - 0.5) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-28 shrink-0 text-right text-xs text-[hsl(var(--muted-foreground))]">
                            <strong className="text-[hsl(var(--foreground))]">{a.letter}</strong> {pct(winnerShare)}% · {conf}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {systemsEvidence.join(' · ')}
                  </p>
                </div>

                {/* ---- Calibration ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Calibration</h2>
                  <p className="page-body text-[1.03rem] mb-5">
                    The scan only sees what I write <em>about</em>, not how I decide. So the three axes it was
                    least sure of got a short forced-choice test to break the ties.
                  </p>
                  <ul className="space-y-4">
                    {calibration.map((c) => (
                      <li key={c.axis} className="flex gap-4">
                        <span className="w-12 shrink-0 text-[1.0rem] font-semibold tabular-nums">{c.axis}</span>
                        <div>
                          <p className="text-[1.0rem] leading-snug">
                            scan <strong>{c.scan}</strong>
                            <span className="text-[hsl(var(--muted-foreground))]"> → </span>
                            self-report <strong>{c.selfReport}</strong>{' '}
                            <span className={c.flipped ? 'text-[hsl(var(--foreground))] font-medium' : 'text-[hsl(var(--muted-foreground))]'}>
                              {c.flipped ? '(flipped)' : '(confirmed)'}
                            </span>
                          </p>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">{c.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-5 leading-relaxed">
                    The test also surfaced something the essays can&apos;t: this used to be values-first —
                    &ldquo;it mattered to me, then it had to make sense&rdquo; — and has shifted to logic-first and
                    more pragmatic. The corpus, written earlier, still carries the older Feeling-led voice; the
                    current read is Thinking-led. So {mbtiGuess} isn&apos;t wrong so much as dated — it&apos;s the
                    earlier self the writing captured.
                  </p>
                </div>

                {/* ---- Cognitive functions ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Cognitive functions</h2>
                  <p className="page-body text-[1.03rem] mb-5">
                    Below the four letters sits a function stack. An Ne engine builds theory and sprays it across
                    domains; the open question was whether it&apos;s steered by values (Fi) or by logic (Ti) —
                    the whole {mbtiGuess} / {calibratedType} split. Calibration settled it on Ti, with Fi dropped
                    to fuel.
                  </p>
                  <ul className="space-y-4">
                    {functionStack.map((fn) => (
                      <li key={fn.code} className="flex gap-4">
                        <span className="w-9 shrink-0 text-[1.05rem] font-semibold tabular-nums">{fn.code}</span>
                        <div>
                          <p className="text-[1.0rem] leading-snug">
                            <span className="font-medium">{fn.name}</span>
                            <span className="text-[hsl(var(--muted-foreground))]"> — {fn.role}</span>
                          </p>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">{fn.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ---- Who I am ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Who I am</h2>
                  <p className="page-body text-[1.03rem] leading-relaxed">
                    An autodidact who treats his own mind as the primary object of study and writing as the
                    instrument for doing it. He lives at high altitude — everything becomes an abstraction, an
                    analogy, a level higher in meta — and is happiest reducing a messy world to clean models:
                    education-as-startup, brain-as-transformer, human-as-entropy-reversing-algorithm. Beneath the
                    cool analytical surface runs a non-negotiable value system: a self-declared missionary who
                    cannot make himself work on anything he isn&apos;t obsessed with, who prizes meaning and
                    authenticity over money or status, shaped early by a confrontation with mortality that turned
                    fear into urgency and freedom.
                  </p>
                </div>

                {/* ---- Personality ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Personality</h2>
                  <ul className="space-y-2 text-[1.03rem] leading-relaxed">
                    <li>Abstract, system-first, contrarian. Rejects default frames and conventional paths.</li>
                    <li>Meaning and autonomy over compliance, money, or status.</li>
                    <li>Obsession-driven, not discipline-driven — ideation speed exceeds organizational discipline.</li>
                    <li>Indifferent to social harmony; runs on an honestly-owned insecurity turned into fuel.</li>
                  </ul>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {agencyEvidence.join(' · ')}
                  </p>
                </div>

                {/* ---- Learning ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Learning</h2>
                  <ul className="space-y-2 text-[1.03rem] leading-relaxed">
                    <li>Learns by building and testing against reality, not passive intake.</li>
                    <li>Writing and dialogue used to debug thinking in real time.</li>
                    <li>Chases understanding over knowledge — why the wrong way is wrong.</li>
                    <li>If knowledge isn&apos;t tied to agency or output, it gets dropped.</li>
                  </ul>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {writingEvidence.join(' · ')}
                  </p>
                </div>

                {/* ---- How to work with me ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">How to work with me</h2>
                  <ul className="space-y-2 text-[1.03rem] leading-relaxed">
                    <li>Bring hard problems, constraints, and explicit tradeoffs.</li>
                    <li>Lead with mechanism, not social proof.</li>
                    <li>One written decision memo before major commitments.</li>
                    <li>Split work into: idea phase, structure phase, ship phase.</li>
                  </ul>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {executionEvidence.join(' · ')}
                  </p>
                </div>

                {/* ---- The T/F line ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Thinking vs Feeling</h2>
                  <p className="text-[1.03rem] leading-relaxed">
                    The pivotal axis — the one that decides which function leads. The scan puts Feeling ahead at{' '}
                    {pct(tfAxis.rightShare)}%, because the essays are <em>about</em> meaning, purpose, obsession
                    and authenticity. But self-report on <em>how</em> decisions actually get made came back
                    Thinking: internal consistency over value-fit, pragmatism over &ldquo;it matters to me.&rdquo;
                    So the resolved read is logic in the lead with values as fuel ({calibratedType}) — and, tellingly,
                    it wasn&apos;t always: this drifted from Feeling-led to Thinking-led over time, which is why the
                    older writing still scans {mbtiGuess}.
                  </p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {feelingEvidence.join(' · ')}
                  </p>
                </div>

                {/* ---- Tensions ---- */}
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Unresolved tensions</h2>
                  <ul className="space-y-3 text-[1.03rem] leading-relaxed">
                    <li>
                      <span className="font-medium">Detachment vs. status-hunger.</span>{' '}
                      Insists he doesn&apos;t care what anyone thinks, while admitting insecurity and the drive to
                      prove himself are his engine.
                    </li>
                    <li>
                      <span className="font-medium">Anti-planning vs. compulsive optimization.</span>{' '}
                      Preaches &ldquo;just start, don&apos;t overthink&rdquo; while producing ranked value
                      spreadsheets, KPI lists, and multi-step frameworks.
                    </li>
                    <li>
                      <span className="font-medium">Learning as means vs. play for its own sake.</span>{' '}
                      Argues learning must be instrumental, then champions studying physics purely for wonder.
                    </li>
                  </ul>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {uncertaintyEvidence.join(' · ')}
                  </p>
                </div>

                {/* ---- Methodology ---- */}
                <div className="pt-4 section-divider">
                  <p className="page-body text-[1.08rem] leading-relaxed">
                    Most of this profile is generated from published essays — no self-reported data. Each of the
                    four axes is scored by matching a bank of weighted words and phrases (drawn from my own
                    vocabulary) against all {essays.length} essays, normalising each side into a share, and
                    reporting a confidence built from how lopsided the split is and how much evidence backs it.
                    That&apos;s why some axes read &ldquo;strong&rdquo; and others &ldquo;weak&rdquo; — the numbers,
                    not the prose, decide. Then the borderline axes get one correction: a short forced-choice test
                    breaks the ties the text can&apos;t, since the writing shows what I think <em>about</em>, not
                    how I decide. It&apos;s still imperfect by design — writing reveals tendencies, not truths —
                    and the calibration only nudges the axes the scan already flagged as unsure. Think of it less
                    as a personality test and more as a mirror built from text, wiped clean in the two or three
                    spots where the glass was foggy.
                  </p>
                </div>
              </section>

              <footer className="page-footer">
                <p>© <Copyright /> Marius Manolachi</p>
              </footer>
            </div>
          </main>

          <DesktopNavigation />
        </div>
      </div>
    </>
  );
}
