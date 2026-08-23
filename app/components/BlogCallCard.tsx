import Image from 'next/image';
import Link from 'next/link';
import { spotsNote } from '@/app/data/learn-ai';

export default function BlogCallCard() {
  return (
    <aside className="blog-call-rail" aria-label="AI Workflow Sprint">
      <Image
        src="/marius.jpg"
        alt="Marius Manolachi"
        width={96}
        height={96}
        className="blog-call-photo"
      />
      <p className="blog-call-name">Marius Manolachi</p>
      <h2>AI Workflow Sprint</h2>
      <p>
        In seven days, we find your highest-leverage AI opportunity, build one
        working workflow, and train your team to run it without me.
      </p>
      {spotsNote ? <p className="blog-call-spots">{spotsNote}.</p> : null}
      <Link href="/learn-ai" className="blog-call-cta">See the $1,000 sprint</Link>
    </aside>
  );
}
