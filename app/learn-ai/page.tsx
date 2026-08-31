import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Copyright from '@/app/components/Copyright';
import QualifyForm from '@/app/components/QualifyForm';
import {
  contactEmail,
  engagementProcess,
  orangeCase,
  offer,
  projectChoices,
  qualifier,
  quietLinks,
  serviceTracks,
  spotsNote,
  studentProof,
  teamSizeChoices,
  timelineChoices,
  usageChoices,
} from '@/app/data/learn-ai';
import styles from './learn-ai.module.css';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'AI Services for Companies — Marius Manolachi',
  description:
    'Practical AI training, workflow implementation, and custom AI solutions for companies—from the first opportunity to a working system your team can own.',
  alternates: { canonical: '/learn-ai' },
  openGraph: {
    title: 'From AI Idea to Working System',
    description: 'Training, workflow implementation, and custom AI solutions for companies.',
    url: `${SITE_URL}/learn-ai`,
    siteName: 'Marius Manolachi',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-ai-services.png',
        width: 1200,
        height: 630,
        alt: 'From AI idea to working system — training, workflow implementation, and custom AI solutions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'From AI Idea to Working System',
    description: 'Training, workflow implementation, and custom AI solutions for companies.',
    creator: '@mariusmanolachi',
    images: ['/og-ai-services.png'],
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
        <span className={styles.navLabel}>AI services</span>
        <a href="#apply" className={styles.navCta}>Tell me what you need</a>
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

            <p className={styles.eyebrow}>{offer.eyebrow}</p>
            <h1 className={styles.desktopHeroTitle}>
              <span>From AI idea</span>
              <span>to working system.</span>
            </h1>
            <h1 className={styles.mobileHeroTitle}>
              <span>Make AI</span>
              <span>work for you.</span>
            </h1>
            <p className={`${styles.lead} ${styles.desktopLead}`}>{offer.lead}</p>
            <p className={`${styles.lead} ${styles.mobileLead}`}>
              From practical training to custom AI products, get the right help to move from idea to a system your company can own.
            </p>

            <div className={styles.heroActions}>
              <a href="#apply" className={styles.primaryCta}>
                {offer.ctaLabel} <span aria-hidden="true">↘</span>
              </a>
              <span className={styles.availability}>{spotsNote || 'Now booking'}</span>
            </div>

            <dl className={styles.facts} aria-label="AI services summary">
              <div><dt>Start</dt><dd>{offer.start}</dd></div>
              <div><dt>Build</dt><dd>{offer.build}</dd></div>
              <div><dt>Finish</dt><dd>{offer.finish}</dd></div>
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
          <p>Trusted to make technical ideas useful</p>
          <a href={studentProof.href} target="_blank" rel="noopener noreferrer">
            <strong>{studentCount}</strong>
            <span>students taught on Udemy</span>
            <small>{reviewCount} verified reviews · View profile ↗</small>
          </a>
        </section>

        <section className={styles.services} aria-labelledby="services-heading">
          <div className={styles.servicesHeading}>
            <p>Ways to work together</p>
            <h2 id="services-heading">The right help depends on where your company is stuck.</h2>
            <p>
              Training is useful when capability is the constraint. Implementation is useful when the opportunity is clear. A custom build is useful when the workflow is specific to your business.
            </p>
          </div>
          <ol className={styles.serviceGrid}>
            {serviceTracks.map((service) => (
              <li key={service.number}>
                <span>{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <strong>{service.result}</strong>
              </li>
            ))}
          </ol>
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
            <p>How the work happens</p>
            <h2 id="process-heading">Fit the engagement to the problem, not the other way around.</h2>
          </div>
          <ol>
            {engagementProcess.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="apply" className={styles.apply} aria-label="AI services intake">
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
