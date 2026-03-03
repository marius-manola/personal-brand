import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import Copyright from '@/app/components/Copyright';
import { getAllEssays } from '@/lib/server/essays.server';

type Axis = {
  name: string;
  left: string;
  right: string;
  leftWords: string[];
  rightWords: string[];
};

function countMatches(text: string, words: string[]): number {
  return words.reduce((acc, word) => acc + (text.match(new RegExp(word, 'g')) || []).length, 0);
}

function topEssayTitles(
  entries: Array<{ title: string; text: string }>,
  words: string[],
  limit = 3
): string[] {
  return entries
    .map((entry) => ({ title: entry.title, score: countMatches(entry.text, words) }))
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

  const mbtiAxes: Axis[] = [
    {
      name: 'I/E',
      left: 'I',
      right: 'E',
      leftWords: ['writing', 'thinking', 'reflect', 'alone', 'question'],
      rightWords: ['people', 'community', 'team', 'share', 'talk'],
    },
    {
      name: 'N/S',
      left: 'N',
      right: 'S',
      leftWords: ['system', 'model', 'framework', 'meaning', 'abstract', 'why'],
      rightWords: ['routine', 'process', 'steps', 'daily', 'practical'],
    },
    {
      name: 'T/F',
      left: 'T',
      right: 'F',
      leftWords: ['logic', 'first principles', 'structure', 'analysis', 'design'],
      rightWords: ['feel', 'emotion', 'love', 'connection', 'empathy'],
    },
    {
      name: 'J/P',
      left: 'J',
      right: 'P',
      leftWords: ['kpi', 'goal', 'plan', 'discipline', 'optimi'],
      rightWords: ['uncertainty', 'unknown', 'adapt', 'just start', 'serendipity'],
    },
  ];

  const mbtiLetters = mbtiAxes.map((axis) => {
    const left = countMatches(corpus, axis.leftWords);
    const right = countMatches(corpus, axis.rightWords);
    return left >= right ? axis.left : axis.right;
  });
  const mbtiGuess = mbtiLetters.join('');

  const systemsEvidence = topEssayTitles(entries, ['system', 'framework', 'feedback', 'design', 'model']);
  const agencyEvidence = topEssayTitles(entries, ['agency', 'freedom', 'intrinsic', 'autonomy', 'choice']);
  const uncertaintyEvidence = topEssayTitles(entries, ['uncertainty', 'unknown', 'adapt', 'just start', 'serendipity']);
  const writingEvidence = topEssayTitles(entries, ['writing', 'thinking', 'essay', 'articulate', 'reflect']);
  const executionEvidence = topEssayTitles(entries, ['startup', 'build', 'ship', 'founder', 'market', 'leverage']);

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
                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">MBTI</h2>
                  <p className="page-body text-[1.08rem] mb-3">
                    <strong>{mbtiGuess}</strong> — strongest signal on N and T. The J/P axis is unstable: plans are discussed, but action under uncertainty is favored.
                  </p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {systemsEvidence.join(' · ')}
                  </p>
                </div>

                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Personality</h2>
                  <ul className="space-y-2 text-[1.03rem] leading-relaxed">
                    <li>Abstract, system-first, contrarian. Rejects default frames.</li>
                    <li>Meaning and autonomy over compliance or status.</li>
                    <li>Ideation speed exceeds organizational discipline.</li>
                  </ul>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {agencyEvidence.join(' · ')}
                  </p>
                </div>

                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Learning</h2>
                  <ul className="space-y-2 text-[1.03rem] leading-relaxed">
                    <li>Learns by building and testing, not passive intake.</li>
                    <li>Writing and dialogue used to debug thinking in real time.</li>
                    <li>If knowledge isn&apos;t tied to agency or output, it gets dropped.</li>
                  </ul>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {writingEvidence.join(' · ')}
                  </p>
                </div>

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

                <div>
                  <h2 className="text-[0.68rem] uppercase tracking-[0.12em] text-[hsl(var(--muted-foreground))] mb-4">Tension</h2>
                  <p className="text-[1.03rem] leading-relaxed">
                    Desire for disciplined optimization versus a stated preference for uncertainty, emergence, and serendipity. This conflict drives output but creates inconsistency.
                  </p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">
                    {uncertaintyEvidence.join(' · ')}
                  </p>
                </div>

                <div className="pt-4 section-divider">
                  <p className="page-body text-[1.08rem] leading-relaxed">
                    This profile is generated entirely from published essays — no self-reported data, no questionnaires.
                    The analysis scans for recurring word patterns across all {essays.length} essays and maps them
                    to known personality dimensions. It&apos;s imperfect by design: writing reveals tendencies, not truths.
                    What shows up here is whatever I keep returning to — the themes I can&apos;t stop thinking about,
                    the tensions I haven&apos;t resolved, the instincts that shape how I move through problems.
                    Think of it less as a personality test and more as a mirror built from text.
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
