import Image from 'next/image';
import { calendarUrl } from '@/app/data/learn-ai';

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
            <p className="blog-call-kicker">AI consulting</p>
            <p className="blog-call-name">Marius Manolachi</p>
          </div>
        </div>
        <h2>The first call is free</h2>
        <p>
          I consult on using AI at a serious level, on your actual work. I&apos;ve
          taught about 110,000 people, spoken at the OECD on AI and education,
          and I build with Claude Code, Codex, and the rest every day.
        </p>
        <a
          href={calendarUrl}
          className="blog-call-cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          Book a free first call
        </a>
      </div>
    </aside>
  );
}
