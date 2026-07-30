'use client';

import { useState, type FormEvent } from 'react';
import { ShimmerButton } from '@/components/ui/shimmer-button';

// Screener form for /learn-ai.
//
// All copy and choices arrive as props from the server page. That's deliberate:
// app/data/learn-ai.ts also holds `calendarUrl`, and importing that module here
// would risk bundling the URL into the client — which is exactly what the
// screener exists to prevent. The calendar link only ever arrives in the
// /api/qualify response, after the server has scored the answers.

export interface Choice {
  value: string;
  label: string;
}

export interface QualifyFormProps {
  heading: string;
  intro: string;
  /** e.g. "5 spots open this month". Hidden once the form is answered. */
  spotsNote?: string;
  fields: {
    name: string;
    email: string;
    project: string;
    usage: string;
    timeline: string;
    detail: string;
    detailHint: string;
  };
  projectChoices: Choice[];
  usageChoices: Choice[];
  timelineChoices: Choice[];
  submitLabel: string;
  submitting: string;
  booked: {
    heading: string;
    body: string;
    opened: string;
    ctaLabel: string;
    undelivered: string;
  };
  error: { heading: string; body: string };
  contactEmail: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done'; calendarUrl: string; delivered: boolean; openedInNewTab: boolean }
  | { kind: 'error'; message?: string };

export default function QualifyForm({
  heading,
  intro,
  spotsNote,
  fields,
  projectChoices,
  usageChoices,
  timelineChoices,
  submitLabel,
  submitting,
  booked,
  error,
  contactEmail,
}: QualifyFormProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ kind: 'submitting' });

    // Opened here, synchronously, while the click is still the reason we're running.
    // Waiting until after the await would put window.open outside the user gesture,
    // and every popup blocker would swallow it. The blank tab is parked and pointed
    // at the calendar once the server answers, or closed if there's nothing to show.
    const calendarTab = window.open('', '_blank');

    try {
      const response = await fetch('/api/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.calendarUrl) {
        calendarTab?.close();
        setStatus({ kind: 'error', message: payload?.error });
        return;
      }

      if (calendarTab) {
        calendarTab.location = payload.calendarUrl;
      }
      setStatus({
        kind: 'done',
        calendarUrl: payload.calendarUrl,
        // The button stays on screen regardless: a blocked popup must never be the
        // difference between booking and not booking.
        openedInNewTab: calendarTab !== null && !calendarTab.closed,
        delivered: payload.delivered !== false,
      });
    } catch {
      calendarTab?.close();
      setStatus({ kind: 'error' });
    }
  }

  // The result replaces the header AND the form: once it's answered there's nothing
  // to edit, and leaving "four questions" above a calendar reads like the page
  // didn't notice.
  if (status.kind === 'done') {
    return (
      <div className="form-result" aria-live="polite">
        <h3 className="form-result-heading">{booked.heading}</h3>
        <p className="page-body">
          {status.openedInNewTab ? booked.opened : booked.body}
        </p>
        <a
          href={status.calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-button mt-1 inline-flex items-center justify-center border no-underline"
        >
          {booked.ctaLabel}
        </a>
        {!status.delivered && <p className="field-hint">{booked.undelivered}</p>}
      </div>
    );
  }

  const isSubmitting = status.kind === 'submitting';

  return (
    <>
      <div className="apply-head">
        <h2 className="apply-heading">{heading}</h2>
        <p className="page-body mt-2">{intro}</p>
        {spotsNote && <p className="cta-note mt-2">{spotsNote}</p>}
      </div>

      <form className="qualify-form" onSubmit={handleSubmit} noValidate={false}>
        <div className="field-row">
          <label className="field">
            <span className="field-label">{fields.name}</span>
            <input
              className="field-control"
              type="text"
              name="name"
              required
              maxLength={120}
              autoComplete="name"
            />
          </label>

          <label className="field">
            <span className="field-label">{fields.email}</span>
            <input
              className="field-control"
              type="email"
              name="email"
              required
              maxLength={200}
              autoComplete="email"
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">{fields.project}</span>
            <select className="field-control" name="project" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {projectChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">{fields.usage}</span>
            <select className="field-control" name="usage" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {usageChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field-label">{fields.timeline}</span>
            <select className="field-control" name="timeline" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {timelineChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">{fields.detail}</span>
          <textarea
            className="field-control field-textarea"
            name="detail"
            required
            rows={4}
            maxLength={2000}
            aria-describedby="detail-hint"
          />
          <span id="detail-hint" className="field-hint">
            {fields.detailHint}
          </span>
        </label>

        {/* Honeypot — hidden from people, irresistible to bots. */}
        <div className="hp-field" aria-hidden="true">
          <label>
            Company
            <input type="text" name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div className="form-actions">
          <ShimmerButton
            type="submit"
            disabled={isSubmitting}
            background="hsl(var(--brand))"
            className="cta-button disabled:opacity-60"
          >
            {isSubmitting ? submitting : submitLabel}
          </ShimmerButton>

          {status.kind === 'error' && (
            <p className="form-error" role="alert">
              <strong>{error.heading}.</strong> {status.message || error.body}{' '}
              <a className="text-link" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            </p>
          )}
          </div>
      </form>
    </>
  );
}
