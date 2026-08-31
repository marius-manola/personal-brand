'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

export interface Choice {
  value: string;
  label: string;
}

type AnswerKey = 'project' | 'teamSize' | 'usage' | 'timeline' | 'detail' | 'name' | 'email';
type Answers = Record<AnswerKey, string>;

export interface QualifyFormProps {
  heading: string;
  intro: string;
  spotsNote?: string;
  fields: Record<AnswerKey, string> & { detailHint: string; detailPlaceholder: string };
  projectChoices: Choice[];
  teamSizeChoices: Choice[];
  usageChoices: Choice[];
  timelineChoices: Choice[];
  nextLabel: string;
  backLabel: string;
  submitLabel: string;
  submitting: string;
  booked: {
    heading: string;
    body: string;
    ctaLabel: string;
    undelivered: string;
  };
  error: { heading: string; body: string };
  contactEmail: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done'; calendarUrl: string; delivered: boolean }
  | { kind: 'error'; message?: string };

const EMPTY_ANSWERS: Answers = {
  project: '',
  teamSize: '',
  usage: '',
  timeline: '',
  detail: '',
  name: '',
  email: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function conversion(type: 'intake_start' | 'intake_submit' | 'calendar_open', name = '') {
  try {
    const landingSlug = window.sessionStorage.getItem('mm_landing_slug') || 'learn-ai';
    const src = window.sessionStorage.getItem('mm_landing_src') || '';
    const sid = window.sessionStorage.getItem('mm_sid') || '';
    const vid = window.localStorage.getItem('mm_vid') || '';
    const payload = JSON.stringify({ type, slug: 'learn-ai', path: '/learn-ai', ms: 0, ref: document.referrer, src, sid, vid, landingSlug, name });
    navigator.sendBeacon('/api/analytics/collect', new Blob([payload], { type: 'application/json' }));
  } catch { /* analytics must never block intake */ }
}

export default function QualifyForm({
  heading,
  intro,
  spotsNote,
  fields,
  projectChoices,
  teamSizeChoices,
  usageChoices,
  timelineChoices,
  nextLabel,
  backLabel,
  submitLabel,
  submitting,
  booked,
  error,
  contactEmail,
}: QualifyFormProps) {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [company, setCompany] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailHintId = useId();
  const started = useRef(false);

  const steps: Array<{
    id: AnswerKey;
    question: string;
    choices?: Choice[];
    kind: 'choices' | 'textarea' | 'text' | 'email';
  }> = [
    { id: 'project', question: fields.project, choices: projectChoices, kind: 'choices' },
    { id: 'teamSize', question: fields.teamSize, choices: teamSizeChoices, kind: 'choices' },
    { id: 'usage', question: fields.usage, choices: usageChoices, kind: 'choices' },
    { id: 'timeline', question: fields.timeline, choices: timelineChoices, kind: 'choices' },
    { id: 'detail', question: fields.detail, kind: 'textarea' },
    { id: 'name', question: fields.name, kind: 'text' },
    { id: 'email', question: fields.email, kind: 'email' },
  ];

  const step = steps[stepIndex];
  const value = answers[step.id];
  const answerIsValid = step.id === 'email'
    ? EMAIL_PATTERN.test(value.trim())
    : step.id === 'detail'
      ? value.trim().length >= 20
      : value.trim().length > 0;
  const isLastStep = stepIndex === steps.length - 1;
  const isSubmitting = status.kind === 'submitting';

  useEffect(() => {
    if (stepIndex > 0) stepHeadingRef.current?.focus();
  }, [stepIndex]);

  const setAnswer = (key: AnswerKey, nextValue: string) => {
    if (!started.current) {
      started.current = true;
      conversion('intake_start', key);
    }
    setAnswers((current) => ({ ...current, [key]: nextValue }));
    if (status.kind === 'error') setStatus({ kind: 'idle' });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answerIsValid || isSubmitting) return;

    if (!isLastStep) {
      setStepIndex((current) => current + 1);
      return;
    }

    setStatus({ kind: 'submitting' });
    try {
      const response = await fetch('/api/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, company }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.calendarUrl) {
        setStatus({ kind: 'error', message: payload?.error });
        return;
      }

      setStatus({
        kind: 'done',
        calendarUrl: payload.calendarUrl,
        delivered: payload.delivered !== false,
      });
      conversion('intake_submit', 'qualified-intake');
    } catch {
      setStatus({ kind: 'error' });
    }
  }

  if (status.kind === 'done') {
    return (
      <div className="intake-result" aria-live="polite">
        <span className="intake-result-mark" aria-hidden="true">✓</span>
        <p className="intake-kicker">Intake complete</p>
        <h2>{booked.heading}</h2>
        <p>{booked.body}</p>
        <a
          href={status.calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="intake-primary"
          onClick={() => conversion('calendar_open', 'booking-calendar')}
        >
          {booked.ctaLabel} <span aria-hidden="true">↗</span>
        </a>
        {!status.delivered && <p className="intake-delivery-note">{booked.undelivered}</p>}
      </div>
    );
  }

  return (
    <div className="intake-shell">
      <header className="intake-intro">
        <p className="intake-kicker">Start here</p>
        <h2>{heading}</h2>
        <p>{intro}</p>
        {spotsNote && <span>{spotsNote}</span>}
      </header>

      <div className="intake-progress" aria-hidden="true">
        <i style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>

      <form className="intake-form" onSubmit={handleSubmit} noValidate>
        <div className="intake-step-meta">
          <span>Question {stepIndex + 1} of {steps.length}</span>
          <span>{Math.round(((stepIndex + 1) / steps.length) * 100)}%</span>
        </div>

        <fieldset className="intake-question">
          <legend className="sr-only">{step.question}</legend>
          <h3 ref={stepHeadingRef} tabIndex={-1}>{step.question}</h3>

          {step.kind === 'choices' && (
            <div className="intake-choices">
              {step.choices?.map((choice) => (
                <label key={choice.value} className="intake-choice">
                  <input
                    type="radio"
                    name={step.id}
                    value={choice.value}
                    checked={value === choice.value}
                    onChange={() => setAnswer(step.id, choice.value)}
                  />
                  <span>{choice.label}</span>
                  <i aria-hidden="true">✓</i>
                </label>
              ))}
            </div>
          )}

          {step.kind === 'textarea' && (
            <>
              <textarea
                className="intake-control intake-textarea"
                name={step.id}
                value={value}
                onChange={(event) => setAnswer(step.id, event.target.value)}
                rows={6}
                maxLength={2000}
                placeholder={fields.detailPlaceholder}
                aria-label={step.question}
                aria-describedby={detailHintId}
              />
              <p id={detailHintId} className="intake-hint">{fields.detailHint}</p>
            </>
          )}

          {(step.kind === 'text' || step.kind === 'email') && (
            <input
              className="intake-control"
              type={step.kind}
              name={step.id}
              value={value}
              onChange={(event) => setAnswer(step.id, event.target.value)}
              maxLength={step.kind === 'email' ? 200 : 120}
              autoComplete={step.kind === 'email' ? 'email' : 'name'}
              spellCheck={step.kind === 'email' ? false : undefined}
              aria-label={step.question}
              placeholder={step.kind === 'email' ? 'you@company.com' : 'Your name…'}
            />
          )}
        </fieldset>

        <div className="hp-field" aria-hidden="true">
          <label>
            Company website
            <input
              type="text"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="intake-actions">
          {stepIndex > 0 ? (
            <button
              type="button"
              className="intake-back"
              onClick={() => setStepIndex((current) => current - 1)}
              disabled={isSubmitting}
            >
              <span aria-hidden="true">←</span> {backLabel}
            </button>
          ) : <span />}
          <button type="submit" className="intake-primary" disabled={!answerIsValid || isSubmitting}>
            {isSubmitting ? submitting : isLastStep ? submitLabel : nextLabel}
            {!isSubmitting && <span aria-hidden="true">→</span>}
          </button>
        </div>

        {status.kind === 'error' && (
          <p className="intake-error" role="alert">
            <strong>{error.heading}.</strong> {status.message || error.body}{' '}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
        )}
      </form>
    </div>
  );
}
