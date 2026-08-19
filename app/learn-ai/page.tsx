import type { Metadata } from 'next';
import Link from 'next/link';
import Copyright from '@/app/components/Copyright';
import ShimmerLink from '@/app/components/ShimmerLink';
import { BlurFade } from '@/components/ui/blur-fade';
import { NumberTicker } from '@/components/ui/number-ticker';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import LinkedInQuote from '@/app/components/LinkedInQuote';
import PhotoStrip from '@/app/components/PhotoStrip';
import QualifyForm from '@/app/components/QualifyForm';
import {
  fit,
  guarantee,
  hero,
  offer,
  includesNote,
  pricing,
  contactEmail,
  prep,
  profileLink,
  projectChoices,
  ledger,
  proofPhotos,
  qualifier,
  quietLinks,
  spotsOpen,
  teamsNote,
  usageChoices,
  testimonial,
  timelineChoices,
  youGet,
} from '@/app/data/learn-ai';

// This is the one page on the site that gets shared as a link, so it carries its
// own title/description/OG rather than inheriting the root layout's.
export const metadata: Metadata = {
  title: 'AI consulting - Marius Manolachi',
  description:
    'One to one consulting on using AI at a serious level. Claude Code, Codex, and the rest. I build with these tools daily and I’ve taught about 110,000 people to use them.',
  alternates: { canonical: 'https://mariusmanolachi.com/learn-ai' },
  openGraph: {
    title: 'AI consulting - Marius Manolachi',
    description:
      'One-to-one AI coaching for people who already use ChatGPT but not nearly enough.',
    url: 'https://mariusmanolachi.com/learn-ai',
    siteName: 'Marius Manolachi',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI consulting - Marius Manolachi',
    description:
      'One-to-one AI coaching for people who already use ChatGPT but not nearly enough.',
    creator: '@mariusmanolachi',
  },
};

// Reveal timing — hero only.
//
// Sections below the hero used to fade in one by one with an identical entrance,
// which reads as an effect applied to a page rather than a designed moment. The
// cascade now belongs to the hero and the photo strip; everything else is simply
// there when you arrive.
//
// Every reveal is mount-triggered rather than scroll-triggered (no `inView` on
// BlurFade). motion writes the hidden variant — opacity:0, blur(6px) — straight
// into the server-rendered HTML, so gating the visible state on an
// IntersectionObserver callback means this page's copy is invisible until that
// callback lands. On a sales page that risk isn't worth the scroll-reveal: a
// missed observer, an aggressive scroll restore, or a crawler snapshot all leave
// a blank page. Mount + stagger gives the same cascade and can't strand content.
const STEP = 0.07;

// Without JS, motion's hidden inline styles are never animated away and
// NumberTicker never counts up from 0 — so force the resting state and swap each
// ticker for its static twin. The proof numbers are the credibility on this page;
// they must never render as "0 students taught".
const NO_JS_REVEAL = [
  '.reveal{opacity:1!important;filter:none!important;transform:none!important}',
  '.ticker-live{display:none}',
  '.ticker-fallback{display:inline}',
].join('');

const numberFormat = new Intl.NumberFormat('en-US');

// Standalone landing page: no MobileNavigation / DesktopNavigation. It's reached
// by direct link (Facebook community, X, bio) and its only job is the booking
// call, so the site nav would just be an exit. `home` sits quietly in the footer
// so the page isn't a dead end.
export default function LearnAI() {
  return (
    <>
      <noscript>
        <style>{NO_JS_REVEAL}</style>
      </noscript>

      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        {/* strip-guard: clips the photo strip where it escapes the frame, so
            the overflow never turns into a horizontal scrollbar. */}
        <div className="strip-guard flex justify-center">
          <main className="page-main learn-page">
            <div className="page-stack">
              {/* 1 · hero — what I'm doing, and the one action */}
              <header className="page-header">
                <BlurFade delay={STEP} className="reveal hero-meta">
                  {spotsOpen > 0 && (
                    <span className="spots-badge">
                      <span className="spots-dot" aria-hidden="true" />
                      <AnimatedShinyText className="mx-0 max-w-none text-[hsl(var(--muted-foreground))]">
                        {spotsOpen} spots open this month
                      </AnimatedShinyText>
                    </span>
                  )}
                  <a
                    className="hero-link"
                    href={profileLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {profileLink.label} &rarr;
                  </a>
                </BlurFade>

                <BlurFade delay={STEP * 2} className="reveal">
                  <h1 className="hero-title">{hero.title}</h1>
                </BlurFade>

                <BlurFade delay={STEP * 3} className="reveal">
                  <p className="hero-lead">{hero.lead}</p>
                </BlurFade>

                <BlurFade delay={STEP * 4} className="reveal">
                  <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <ShimmerLink href="#apply" newTab={false}>
                      {hero.ctaLabel}
                    </ShimmerLink>
                    <span className="cta-note">{hero.ctaNote}</span>
                  </div>
                </BlurFade>
              </header>

              {/* 2 · photo strip — a band of tilted proof shots under the hero */}
              <BlurFade delay={STEP * 5} className="reveal">
                <PhotoStrip photos={proofPhotos} />
              </BlurFade>

              {/* 2 · the ledger — numbers and credentials in one ruled table, each
                   checkable. Replaced a metrics band plus a separate list of links
                   that repeated the same figures back at the reader. */}
              <section className="lp-section">
                <h2 className="section-label lp-rail">{ledger.label}</h2>
                <div className="lp-content">
                  <p className="page-body">{ledger.intro}</p>
                  <dl className="ledger">
                    {ledger.rows.map((row) => {
                      const body = (
                        <>
                          {row.value !== undefined && (
                            <dt className="ledger-value">
                              <span className="ticker-live">
                                <NumberTicker
                                  value={row.value}
                                  className="text-[hsl(var(--foreground))] tracking-normal dark:text-[hsl(var(--foreground))]"
                                />
                              </span>
                              <span className="ticker-fallback">
                                {numberFormat.format(row.value)}
                              </span>
                              {row.suffix}
                            </dt>
                          )}
                          {/* Credential rows carry no figure, so the text takes the
                              number column too rather than leaving a gap. */}
                          <dd
                            className={`ledger-text${row.value === undefined ? ' ledger-text-wide' : ''}`}
                          >
                            {row.text}
                          </dd>
                          {row.linkLabel && <dd className="ledger-link">{row.linkLabel} →</dd>}
                        </>
                      );
                      return row.href ? (
                        <a
                          key={row.text}
                          className="ledger-row"
                          href={row.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {body}
                        </a>
                      ) : (
                        <div key={row.text} className="ledger-row">
                          {body}
                        </div>
                      );
                    })}
                  </dl>
                </div>
              </section>

              {/* 4 · the offer + what you get, as one block */}
              {/* 3 · what people say, ahead of the pitch so the claim that follows
                   arrives already vouched for */}
              <section className="lp-section">
                <h2 className="section-label lp-rail">what people say</h2>
                <div className="lp-content">
                  <LinkedInQuote item={testimonial} />
                </div>
              </section>

              {/* 4 · who this is for */}
              <section className="lp-section">
                <h2 className="section-label lp-rail">{offer.label}</h2>
                <div className="lp-content">
                  <p className="page-body page-body-lead">{offer.intro}</p>
                  <ul className="short-list mt-6">
                    {youGet.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="page-body mt-6">{offer.framework}</p>
                  <p className="page-body mt-5">{offer.after}</p>
                </div>
              </section>

              {/* 4 · how it's priced — no public rate card */}
              <section className="lp-section">
                <div className="lp-rail">
                  <h2 className="section-label">{pricing.label}</h2>
                  <p className="lp-rail-note">{pricing.railNote}</p>
                </div>
                <div className="lp-content">
                  <p className="page-body">{pricing.intro}</p>
                  <p className="mt-4 text-[0.95rem] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {includesNote}
                  </p>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {guarantee} {teamsNote}
                  </p>
                </div>
              </section>

              {/* 5 · probably not a fit */}
              <section className="lp-section">
                <h2 className="section-label lp-rail">{fit.label}</h2>
                <div className="lp-content">
                  <ul className="short-list">
                    {fit.notFor.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 7 · prep — doubles as the last qualifier */}
              <section className="lp-section">
                <h2 className="section-label lp-rail">{prep.label}</h2>
                <ul className="lp-content prep-list">
                  {prep.items.map((item) => (
                    <li key={item}>
                      <span className="text-[1rem] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 8 · the screener — the only route to the calendar.
                   This replaced a closing CTA panel: with the form as the last
                   section, a button pointing down at it was pointing at itself. */}
              <section>
                <section id="apply" className="apply-panel">
                  <QualifyForm
                    heading={qualifier.heading}
                    intro={qualifier.intro}
                    spotsNote={spotsOpen > 0 ? `${spotsOpen} spots open this month` : undefined}
                    fields={qualifier.fields}
                    projectChoices={projectChoices}
                    usageChoices={usageChoices}
                    timelineChoices={timelineChoices}
                    submitLabel={qualifier.submitLabel}
                    submitting={qualifier.submitting}
                    booked={qualifier.booked}
                    error={qualifier.error}
                    contactEmail={contactEmail}
                  />
                </section>
              </section>

              {/* 8 · footer */}
              <footer className="page-footer flex flex-wrap items-center justify-between gap-3">
                <p>
                  © <Copyright /> Marius Manolachi
                </p>
                <div className="footer-links">
                  {quietLinks.map((link) =>
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link key={link.label} href={link.href}>
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
