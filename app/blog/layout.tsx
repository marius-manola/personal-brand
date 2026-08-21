import type { Metadata } from 'next';
import MobileConsultingPopup from '@/app/components/MobileConsultingPopup';

export const metadata: Metadata = {
  title: {
    default: 'Blog — Marius Manolachi',
    template: '%s — Marius Manolachi',
  },
  description: 'Notes on building, learning, and technology by Marius Manolachi.',
  alternates: {
    canonical: '/blog',
    types: {
      'application/rss+xml': '/blog/rss.xml',
    },
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MobileConsultingPopup />
    </>
  );
}
