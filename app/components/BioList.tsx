import Link from 'next/link';
import { bioLines } from '../data/home';
import AgeCounter from './AgeCounter';

// "me in short" bullet list. Server-safe (no hooks). Renders each BioLine as a
// bullet, switching on segment.kind. The `age` segment renders the live client
// <AgeCounter /> inline so the age stays live and never hardcoded.
export default function BioList() {
  return (
    <section className="section-block">
      <div className="section-head">
        <span className="section-label">me in short</span>
      </div>
      <ul className="short-list">
        {bioLines.map((line, lineIndex) => (
          <li key={lineIndex}>
            {line.map((segment, segIndex) => {
              switch (segment.kind) {
                case 'text':
                  return <span key={segIndex}>{segment.text}</span>;
                case 'age':
                  return <AgeCounter key={segIndex} />;
                case 'link':
                  // External links open in a new tab; internal links use next/link.
                  return segment.external ? (
                    <a
                      key={segIndex}
                      href={segment.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      {segment.text}
                    </a>
                  ) : (
                    <Link key={segIndex} href={segment.href} className="text-link">
                      {segment.text}
                    </Link>
                  );
              }
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}
