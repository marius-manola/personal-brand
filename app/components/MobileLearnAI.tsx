import Image from 'next/image';
import Link from 'next/link';
import Copyright from '@/app/components/Copyright';
import LinkedInQuote from '@/app/components/LinkedInQuote';
import QualifyForm from '@/app/components/QualifyForm';
import {
  contactEmail,
  fit,
  guarantee,
  includesNote,
  ledger,
  offer,
  prep,
  pricing,
  projectChoices,
  qualifier,
  spotsNote,
  teamsNote,
  testimonial,
  timelineChoices,
  usageChoices,
  youGet,
} from '@/app/data/learn-ai';

const proofRows = ledger.rows.filter((row) => row.value !== undefined).slice(0, 3);

export default function MobileLearnAI() {
  return (
    <main className="m-learn mobile-experience">
      <nav className="m-learn-nav" aria-label="Mobile page navigation">
        <Link href="/">MM</Link>
        <span>{spotsNote || 'Now booking'}</span>
        <a href="#mobile-apply">Start here</a>
      </nav>

      <header className="m-learn-hero">
        <div className="m-learn-person">
          <Image src="/marius.jpg" alt="Marius Manolachi" width={72} height={72} priority />
          <p><strong>Marius Manolachi</strong><span>AI consultant · builder · teacher</span></p>
        </div>
        <p className="m-learn-eyebrow">One to one. On your actual work.</p>
        <h1>Bring the work.<br />Leave capable.</h1>
        <p className="m-learn-lead">
          I help you use AI like a builder: break the problem apart, connect the pieces, test what matters, and ship something real.
        </p>
        <a className="m-learn-primary" href="#mobile-apply">See if it fits <span aria-hidden="true">↓</span></a>
        <p className="m-learn-micro">Free first call · Four questions · One minute</p>
      </header>

      <section className="m-learn-proof" aria-labelledby="mobile-proof-heading">
        <div className="m-section-head">
          <p>Proof, not positioning</p>
          <h2 id="mobile-proof-heading">You can check the work.</h2>
        </div>
        <div className="m-proof-scroll">
          {proofRows.map((row) => (
            <a key={row.text} href={row.href} target="_blank" rel="noopener noreferrer" className="m-proof-card">
              <strong>{row.value?.toLocaleString('en-US')}{row.suffix}</strong>
              <span>{row.text}</span>
              <small>{row.linkLabel} ↗</small>
            </a>
          ))}
        </div>
        <div className="m-proof-receipts">
          {ledger.rows.slice(3).map((row) => (
            <a key={row.text} href={row.href} target="_blank" rel="noopener noreferrer">
              <span>{row.text}</span><small>{row.linkLabel} ↗</small>
            </a>
          ))}
        </div>
      </section>

      <section className="m-learn-system" aria-labelledby="mobile-system-heading">
        <div className="m-section-head m-section-head-light">
          <p>How the work feels</p>
          <h2 id="mobile-system-heading">Your screen.<br />Your hands.<br />Your capability.</h2>
        </div>
        <p>{offer.intro}</p>
        <ol>
          <li><span>01</span><div><strong>Bring the real constraint</strong><p>No invented classroom exercise. We start with what is blocking you now.</p></div></li>
          <li><span>02</span><div><strong>Build it together</strong><p>You do the typing. I explain the system and the decisions while we work.</p></div></li>
          <li><span>03</span><div><strong>Repeat it without me</strong><p>The outcome is not a prompt. It is a way of working you can transfer.</p></div></li>
        </ol>
      </section>

      <section className="m-learn-start" aria-labelledby="mobile-start-heading">
        <div className="m-section-head">
          <p>Pick your starting point</p>
          <h2 id="mobile-start-heading">Where are you stuck?</h2>
        </div>
        <ul>
          {youGet.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}
        </ul>
        <details>
          <summary>What I actually teach</summary>
          <p>{offer.framework}</p>
          <p>{offer.after}</p>
        </details>
      </section>

      <section className="m-learn-quote" aria-label="Client feedback">
        <p className="m-quote-label">Someone who was in the room</p>
        <LinkedInQuote item={testimonial} />
      </section>

      <section className="m-learn-terms" aria-labelledby="mobile-terms-heading">
        <div className="m-section-head">
          <p>{pricing.label}</p>
          <h2 id="mobile-terms-heading">Small print,<br />made large.</h2>
        </div>
        <dl>
          <div><dt>Scope</dt><dd>{pricing.intro}</dd></div>
          <div><dt>Included</dt><dd>{includesNote}</dd></div>
          <div><dt>Guarantee</dt><dd>{guarantee} {teamsNote}</dd></div>
        </dl>
        <div className="m-not-fit">
          <strong>{fit.label}</strong>
          {fit.notFor.map((item) => <p key={item}>{item}</p>)}
        </div>
      </section>

      <section className="m-learn-prep" aria-labelledby="mobile-prep-heading">
        <div className="m-section-head">
          <p>{prep.label}</p>
          <h2 id="mobile-prep-heading">Bring three things.</h2>
        </div>
        <ol>{prep.items.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ol>
      </section>

      <section id="mobile-apply" className="m-learn-apply">
        <QualifyForm
          heading={qualifier.heading}
          intro={qualifier.intro}
          spotsNote={spotsNote || undefined}
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

      <footer className="m-learn-footer">
        <span>© <Copyright /> Marius Manolachi</span>
        <Link href="/blog">Read the field notes</Link>
      </footer>
    </main>
  );
}
