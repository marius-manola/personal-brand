import Image from 'next/image';
import Link from 'next/link';
import { spotsNote } from '@/app/data/learn-ai';

export default function BlogCallCard() {
  return (
    <aside className="blog-call-rail" aria-label="AI services for companies">
      <Image
        src="/marius.jpg"
        alt="Marius Manolachi"
        width={96}
        height={96}
        className="blog-call-photo"
      />
      <p className="blog-call-name">Marius Manolachi</p>
      <h2>Make AI useful in your company</h2>
      <p>
        From practical team training to workflow implementation and custom AI
        solutions, get the right help to move from idea to a system you own.
      </p>
      {spotsNote ? <p className="blog-call-spots">{spotsNote}.</p> : null}
      <Link href="/learn-ai" className="blog-call-cta">Explore AI services</Link>
    </aside>
  );
}
