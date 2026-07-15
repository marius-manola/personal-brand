// Homepage content module.
// Follows the app/data/about.ts / app/data/books.ts convention: all editable
// copy and links for the homepage live here as typed data, not inline JSX.

// Bio bullets ("me in short") are modeled as a discriminated union so the age
// stays LIVE — never store a static age. A `{ kind: 'age' }` segment is rendered
// by BioList as the live <AgeCounter /> client component.
export type BioSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string; external?: boolean }
  | { kind: 'age' };

export type BioLine = BioSegment[];

// The "me in short" bullets from the approved mockup. Each line is a mix of
// text and inline links. Only REAL/verified links are used here.
export const bioLines: BioLine[] = [
  [
    { kind: 'text', text: 'building ' },
    { kind: 'link', text: 'TryUncle', href: 'https://tryuncle.com', external: true },
    { kind: 'text', text: ' — an AI tutor that teaches DaVinci Resolve live on your screen.' },
  ],
  [
    { kind: 'text', text: 'the idea: don’t learn Resolve, just ask. it watches your timeline and points to the next click.' },
  ],
  [
    { kind: 'text', text: 'writing ' },
    { kind: 'link', text: 'essays', href: '/essays' },
    { kind: 'text', text: ' about learning, creativity, and doing hard things.' },
  ],
  [
    { kind: 'text', text: 'reading, hiking, and chasing the ' },
    { kind: 'link', text: 'books', href: '/books' },
    { kind: 'text', text: ' that changed my mind.' },
  ],
  [
    { kind: 'text', text: 'always up for a good conversation — reach me on ' },
    { kind: 'link', text: 'x', href: 'https://x.com/mariusmanolachi', external: true },
    { kind: 'text', text: ' or by ' },
    { kind: 'link', text: 'email', href: 'mailto:mariusmanola@gmail.com', external: true },
    { kind: 'text', text: '.' },
  ],
];

export interface Project {
  name: string;
  blurb: string;
  href: string;
  linkLabel: string;
}

// Current focus first (TryUncle), then earlier work.
export const projects: Project[] = [
  {
    name: 'TryUncle',
    blurb: 'An AI tutor that teaches DaVinci Resolve live on your screen — the second you get stuck, just ask.',
    href: 'https://tryuncle.com',
    linkLabel: 'tryuncle.com',
  },
  {
    name: 'AI Courses',
    blurb: 'Teaching AI and prompt engineering to thousands of students.',
    href: 'https://www.udemy.com/user/marius-manola/',
    linkLabel: 'udemy',
  },
  {
    name: 'PromptEasy',
    blurb: 'A platform revolutionizing AI dataset creation.',
    href: 'https://www.producthunt.com/products/prompteasy-ai#prompteasy-ai',
    linkLabel: 'product hunt',
  },
];

export interface SocialLink {
  label: string;
  href: string;
  external?: boolean;
}

// Footer social links.
export const socialLinks: SocialLink[] = [
  { label: 'x', href: 'https://x.com/mariusmanolachi', external: true },
  { label: 'email', href: 'mailto:mariusmanola@gmail.com', external: true },
];

// Static display string to avoid hydration issues (no live computation).
export const lastUpdated = 'July 2026';
