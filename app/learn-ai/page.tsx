import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Copyright from '@/app/components/Copyright';
import QualifyForm from '@/app/components/QualifyForm';
import {
  contactEmail,
  orangeCase,
  projectChoices,
  qualifier,
  quietLinks,
  spotsNote,
  sprint,
  sprintProcess,
  studentProof,
  teamSizeChoices,
  timelineChoices,
  usageChoices,
} from '@/app/data/learn-ai';
import styles from './learn-ai.module.css';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'AI Implementation for Teams — Marius Manolachi',
  description:
    'A hands-on seven-day AI workflow sprint for teams. Choose a high-value process, implement it in your current stack, and train the team to keep improving it.',
  alternates: { canonical: '/learn-ai' },
  openGraph: {
    title: 'Make AI Useful at Work',
    description: 'One week. One working AI workflow. A team that knows how to run it.',
    url: `${SITE_URL}/learn-ai`,
    siteName: 'Marius Manolachi',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-learn-ai.png',
        width: 1200,
        height: 631,
        alt: 'Make AI useful at work — 7 days, 1 working workflow',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Make AI Useful at Work',
    description: 'One week. One working AI workflow. A team that knows how to run it.',
    creator: '@mariusmanolachi',
    images: ['/og-learn-ai.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#f4f0e8',
};

const studentCount = new Intl.NumberFormat('en-US').format(studentProof.students);
const reviewCount = new Intl.NumberFormat('en-US').format(studentProof.reviews);

export default function LearnAI() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">Skip to content</a>

      <nav className={styles.nav} aria-label="Page navigation">
        <Link href="/" className={styles.wordmark} aria-label="Marius Manolachi home">
          MM
        </Link>
        <span className={styles.navLabel}>Learn AI</span>
        <a href="#apply" className={styles.navCta}>Check Your Workflow</a>
      </nav>

      <main id="main">
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.person}>
              <Image src="/marius.jpg" alt="Marius Manolachi" width={56} height={56} priority />
              <p>
                <strong>Marius Manolachi</strong>
                <span>AI builder, consultant & teacher</span>
              </p>
            </div>

            <p className={styles.eyebrow}>{sprint.eyebrow}</p>
            <h1 className={styles.desktopHeroTitle}>
              <span>Make AI useful</span>
              <span>at work.</span>
            </h1>
            <h1 className={styles.mobileHeroTitle}>
              <span>One AI workflow.</span>
              <span>Working.</span>
            </h1>
            <p className={`${styles.lead} ${styles.desktopLead}`}>{sprint.lead}</p>
            <p className={`${styles.lead} ${styles.mobileLead}`}>
              In 7 days, turn one repeated task into a workflow your team can run.
            </p>

            <div className={styles.heroActions}>
              <a href="#apply" className={styles.primaryCta}>
                {sprint.ctaLabel} <span aria-hidden="true">↘</span>
              </a>
              <span className={styles.availability}>{spotsNote || 'Now booking'}</span>
            </div>

            <dl className={styles.facts} aria-label="AI workflow sprint summary">
              <div><dt>Time</dt><dd>{sprint.duration}</dd></div>
              <div><dt>Result</dt><dd>{sprint.scope}</dd></div>
              <div><dt>Investment</dt><dd>{sprint.price}</dd></div>
            </dl>
          </div>

          <aside className={styles.heroEvidence} aria-label="Udemy teaching profile">
            <a href={studentProof.href} target="_blank" rel="noopener noreferrer" className={styles.heroPhoto}>
              <Image
                src={studentProof.src}
                alt={studentProof.alt}
                width={studentProof.width}
                height={studentProof.height}
                priority
                sizes="(max-width: 760px) calc(100vw - 2rem), 42vw"
              />
            </a>
            <div className={styles.heroEvidenceCaption}>
              <span>Teaching at scale</span>
              <a href={studentProof.href} target="_blank" rel="noopener noreferrer">
                Udemy profile <span aria-hidden="true">↗</span>
              </a>
            </div>
          </aside>
        </header>

        <section className={styles.trustBar} aria-label="Teaching track record">
          <p>Trusted to make technical ideas clear</p>
          <a href={studentProof.href} target="_blank" rel="noopener noreferrer">
            <strong>{studentCount}</strong>
            <span>students taught on Udemy</span>
            <small>{reviewCount} verified reviews · View profile ↗</small>
          </a>
        </section>

        <section className={styles.orangeCase} aria-labelledby="orange-heading">
          <div className={styles.orangeIntro}>
            <p className={styles.caseLabel}>{orangeCase.badge}</p>
            <h2 id="orange-heading">{orangeCase.title}</h2>
            <p>{orangeCase.body}</p>
            <a href={orangeCase.href} target="_blank" rel="noopener noreferrer">
              Read the public testimonial <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className={styles.workshopGallery} aria-label="Photos from the Orange AI workshop">
            <figure className={styles.workshopPhoto}>
              <Image src={orangeCase.src} alt="Marius teaching AI concepts to Orange employees" width={1328} height={1640} />
              <figcaption>Live instruction</figcaption>
            </figure>
            <figure className={`${styles.workshopPhoto} ${styles.workshopPhotoRight}`}>
              <Image src={orangeCase.src} alt="Orange employees taking part in Marius’s practical AI workshop" width={1328} height={1640} />
              <figcaption>Real examples, with the team</figcaption>
            </figure>
          </div>
        </section>

        <section className={styles.process} aria-labelledby="process-heading">
          <div className={styles.sectionHeadingDark}>
            <p>What changes in 7 days</p>
            <h2 id="process-heading">One repeated task becomes a working AI workflow.</h2>
          </div>
          <ol>
            {sprintProcess.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="apply" className={styles.apply} aria-label="Workflow sprint intake">
          <QualifyForm
            heading={qualifier.heading}
            intro={qualifier.intro}
            spotsNote={spotsNote || undefined}
            fields={qualifier.fields}
            projectChoices={projectChoices}
            teamSizeChoices={teamSizeChoices}
            usageChoices={usageChoices}
            timelineChoices={timelineChoices}
            nextLabel={qualifier.nextLabel}
            backLabel={qualifier.backLabel}
            submitLabel={qualifier.submitLabel}
            submitting={qualifier.submitting}
            booked={qualifier.booked}
            error={qualifier.error}
            contactEmail={contactEmail}
          />
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© <Copyright /> Marius Manolachi</span>
        <div>
          {quietLinks.map((link) => link.external ? (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
          ) : (
            <Link key={link.label} href={link.href}>{link.label}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
