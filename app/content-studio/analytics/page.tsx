import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AnalyticsPage() {
  if (!(await isLocalRequest())) notFound();
  return <AnalyticsClient />;
}
