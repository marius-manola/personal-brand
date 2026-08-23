import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Books — Marius Manolachi',
  description: 'Books read and recommended by Marius Manolachi.',
  alternates: { canonical: '/books' },
};

export default function BooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
