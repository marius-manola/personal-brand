import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { countPostWords } from './conversation.mjs';
import { runtimePath } from './state';

export const JOB_ID = /^\d{10,}-[a-z0-9]{8}$/i;

export type DraftPreview = {
  id: string;
  title: string;
  slug?: string;
  answer?: string;
  excerpt?: string;
  date?: string;
  status?: string;
  wordCount: number;
  content: string;
};

export function jobHasDraft(id: string) {
  return JOB_ID.test(id) && existsSync(runtimePath('jobs', id, 'post.mdx'));
}

export function draftWordCount(id: string) {
  if (!jobHasDraft(id)) return undefined;
  try {
    return countPostWords(readFileSync(runtimePath('jobs', id, 'post.mdx'), 'utf8'));
  } catch {
    return undefined;
  }
}

export async function readDraftPreview(id: string): Promise<DraftPreview | null> {
  if (!JOB_ID.test(id)) return null;
  const file = runtimePath('jobs', id, 'post.mdx');
  if (!existsSync(file)) return null;
  const source = await readFile(file, 'utf8');
  const { data, content } = matter(source);
  let status: string | undefined;
  try {
    status = JSON.parse(await readFile(runtimePath('jobs', id, 'state.json'), 'utf8')).status;
  } catch { /* queue status is enough */ }
  return {
    id,
    title: String(data.title || 'Untitled draft'),
    slug: data.slug ? String(data.slug) : undefined,
    answer: data.answer ? String(data.answer) : undefined,
    excerpt: data.excerpt ? String(data.excerpt) : undefined,
    date: data.date ? String(data.date) : undefined,
    status,
    wordCount: countPostWords(source),
    content: content.trim(),
  };
}
