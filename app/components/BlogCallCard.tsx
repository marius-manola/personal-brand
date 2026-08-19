import Link from 'next/link';

export default function BlogCallCard() {
  return (
    <aside className="blog-call-rail" aria-label="Schedule a call">
      <div className="blog-call-card">
        <p className="blog-call-kicker">AI consulting</p>
        <h2>Schedule a call with an AI expert</h2>
        <p>
          Free discovery call for you or your company. We look at your actual work
          and see whether consulting is a fit.
        </p>
        <Link href="/learn-ai#apply" className="blog-call-cta">
          Book a free discovery call
        </Link>
      </div>
    </aside>
  );
}
