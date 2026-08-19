const SITE_URL = 'https://mariusmanolachi.com';

export const about = {
  title: 'About',
  subtitle: 'AI consultant',
  leadPrefix: "I'm ",
  leadSuffix:
    ' years old, born and raised in Moldova. I help people become capable of building AI products on their own work. I do not build it for them as an agency.',
};

export const facts: Array<{ text: string; href?: string; label?: string }> = [
  {
    text: 'Taught 109,753 students across 4 Udemy courses, with 23,929 reviews.',
    href: 'https://www.udemy.com/user/marius-manola/',
    label: 'Udemy',
  },
  {
    text: 'Run a Claude Code learning group with 39,400 members.',
    href: 'https://www.facebook.com/groups/claudecode',
    label: 'group',
  },
  {
    text: 'Shipped NotClass, a consumer app used by more than 10,000 people.',
    href: 'https://notclass.com',
    label: 'NotClass',
  },
  {
    text: 'Building TryUncle, an AI agent that watches the screen and annotates it live.',
    href: 'https://tryuncle.com',
    label: 'TryUncle',
  },
  {
    text: 'Invited to speak at the OECD on AI and education.',
    href: 'https://www.linkedin.com/posts/marius-manolachi_oecd-activity-7138621139106381824-73bf',
    label: 'the talk',
  },
  {
    text: 'Led a ChatGPT workshop at Orange.',
    href: 'https://www.linkedin.com/posts/natalia-melniciuc-phd_continuouslearning-professionaldevelopment-ugcPost-7222195991079231489-fwGg',
    label: 'the workshop',
  },
  {
    text: 'Entrepreneur First, The Bridge, with 35 technical founders.',
    href: 'https://www.joinef.com/',
    label: 'EF',
  },
];

export const sameAs = [
  'https://www.linkedin.com/in/marius-manolachi/',
  'https://www.udemy.com/user/marius-manola/',
  'https://tryuncle.com',
  'https://notclass.com',
  'https://www.facebook.com/groups/claudecode',
];

export const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Marius Manolachi',
  url: `${SITE_URL}/about`,
  image: `${SITE_URL}/marius.jpg`,
  jobTitle: 'AI consultant',
  description:
    'AI consultant and tutor who helps people become capable of building AI products on their own work.',
  sameAs,
  knowsAbout: ['AI consulting', 'AI tutoring', 'AI agents', 'AI product building'],
};

export const description =
  'Marius Manolachi is an AI consultant and tutor. He has taught 109,753 students on Udemy, spoken at the OECD on AI and education, shipped NotClass, and is building TryUncle.';
