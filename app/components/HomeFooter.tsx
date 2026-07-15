import { socialLinks, lastUpdated } from '../data/home';
import Copyright from './Copyright';

// Homepage footer: copyright + a small row of social links, plus a muted
// "last updated" line. Server-safe wrapper rendering the client <Copyright />
// (same pattern as app/essays/page.tsx).
export default function HomeFooter() {
  return (
    <footer className="page-footer">
      <div className="flex justify-between items-baseline gap-4 flex-wrap">
        <p>
          © <Copyright /> Marius Manolachi
        </p>
        <span className="footer-links">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...(link.external && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {link.label}
            </a>
          ))}
        </span>
      </div>
      <p className="mt-2 text-[0.72rem] tracking-[0.06em]">last updated: {lastUpdated}</p>
    </footer>
  );
}
