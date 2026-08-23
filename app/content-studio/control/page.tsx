import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import ControlClient from './ControlClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Growth Control', robots: { index: false, follow: false } };

export default async function ControlPage() {
  if (!(await isLocalRequest())) notFound();
  return <ControlClient />;
}
