import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects — Marius Manolachi',
  description: 'Projects built by Marius Manolachi.',
  alternates: { canonical: '/projects' },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
