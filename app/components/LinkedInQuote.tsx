import type { Testimonial } from '@/app/data/learn-ai';

// A testimonial framed as the LinkedIn post it came from.
//
// Deliberately NOT a pixel-copy of LinkedIn's chrome: it borrows the shape people
// recognise — avatar, name, headline, timestamp, body, engagement row — but stays in
// this site's type and colour, and the whole card links to the real post. It never
// claims to be a screenshot, carries no verification badge, and the reaction counts
// are the real ones. A monogram stands in for the avatar rather than lifting
// someone's photo.
export default function LinkedInQuote({ item }: { item: Testimonial }) {
  return (
    <figure className="li-card">
      <header className="li-head">
        <span className="li-avatar" aria-hidden="true">
          {item.initials}
        </span>
        <div className="li-who">
          <p className="li-name">{item.name}</p>
          <p className="li-headline">{item.headline}</p>
          <p className="li-time">{item.timeAgo} · LinkedIn</p>
        </div>
      </header>

      <blockquote className="li-body">{item.quote}</blockquote>

      <footer className="li-foot">
        <span className="li-stats">
          {item.reactions} reactions · {item.reposts} repost{item.reposts === 1 ? '' : 's'}
        </span>
        <a className="li-link" href={item.href} target="_blank" rel="noopener noreferrer">
          Read the post
        </a>
      </footer>
    </figure>
  );
}
