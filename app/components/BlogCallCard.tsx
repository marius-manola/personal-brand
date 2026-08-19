import Image from 'next/image';
import { calendarUrl, spotsNote } from '@/app/data/learn-ai';

export default function BlogCallCard() {
  return (
    <aside className="blog-call-rail" aria-label="Schedule a call">
      <div className="blog-call-card">
        <div className="blog-call-person">
          <Image
            src="/marius.jpg"
            alt="Marius Manolachi"
            width={80}
            height={80}
            className="blog-call-photo"
          />
          <div>
            {spotsNote ? <p className="blog-call-kicker">{spotsNote}</p> : null}
            <p className="blog-call-name">Marius Manolachi</p>
          </div>
        </div>
        <h2>The first call is free</h2>
        <p>
          Most people use AI at a fraction of what it can do. I take you the
          rest of the way, on the work in front of you, the same way I do with
          Fortune 500 companies. About 110,000 students taught. OECD. I build
          with these tools every day.
        </p>
        <a
          href={calendarUrl}
          className="blog-call-cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          Book the first call
        </a>
      </div>
    </aside>
  );
}
