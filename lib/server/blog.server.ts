import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const BLOG_DIRECTORY = join(process.cwd(), 'content/blog');
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const BLOG_CLUSTERS = [
  { id: 'opportunity', label: 'AI opportunities', description: 'Find workflows and product opportunities where AI can create measurable value.' },
  { id: 'architecture', label: 'AI architecture', description: 'Choose between workflows, retrieval, models, tools, memory, and agents.' },
  { id: 'implementation', label: 'AI implementation', description: 'Build, integrate, deploy, and operate useful AI systems.' },
  { id: 'evaluation', label: 'AI evaluation', description: 'Test quality, reliability, safety, observability, and production outcomes.' },
  { id: 'capability', label: 'AI capability', description: 'Learn the skills and exercises required to build with AI independently.' },
  { id: 'commercial', label: 'AI buying decisions', description: 'Scope pilots and choose between consultants, agencies, platforms, and internal teams.' },
] as const;

export type BlogClusterId = typeof BLOG_CLUSTERS[number]['id'];

export function canonicalBlogCluster(value: unknown): BlogClusterId {
  const raw = String(value || '').toLowerCase();
  if (BLOG_CLUSTERS.some((item) => item.id === raw)) return raw as BlogClusterId;
  if (/architect|rag|model|system.design|memory|agent.design/.test(raw)) return 'architecture';
  if (/implement|build|deploy|integrat|migrat|tool/.test(raw)) return 'implementation';
  if (/evaluat|reliab|quality|observ|test|monitor|failure|debug|security|safe/.test(raw)) return 'evaluation';
  if (/capab|learn|team|skill|tutor|training/.test(raw)) return 'capability';
  if (/commercial|consult|agency|hire|buy|cost|roi|budget|vendor/.test(raw)) return 'commercial';
  return 'opportunity';
}

export interface BlogPostMetadata {
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  draft: boolean;
  answer?: string;
  author: string;
  updated?: string;
  targetQuery?: string;
  cluster?: string;
  parent?: string;
  contentType?: string;
  kind?: string;
  sourceableAtom?: string;
  evidenceType?: string;
  evidenceBasis?: string;
  nextReviewAt?: string;
  sources: string[];
  cover?: string;
  coverAlt?: string;
  faq?: Array<{ q: string; a: string }>;
}

export interface BlogPost {
  slug: string;
  metadata: BlogPostMetadata;
  content: string;
  readingTime: number;
}

export function prepareBlogMdx(source: string): string {
  return source
    .replace(
      /<!--\s*visual-slot:\s*(\S+?)(?:\s*\|\s*purpose:\s*([^]*?))?\s*-->/gi,
      (_match, imagePath: string, purpose?: string) =>
        `\n![${String(purpose || 'Article illustration').trim()}](${imagePath})\n`,
    )
    .replace(/<!--[\s\S]*?-->/g, '');
}

function readingTimeFor(content: string): number {
  const words = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\[\]()!-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
}

function parsePost(fileName: string): BlogPost {
  const slug = fileName.replace(/\.mdx$/, '');
  const source = readFileSync(join(BLOG_DIRECTORY, fileName), 'utf8');
  const { data, content } = matter(source);

  return {
    slug,
    metadata: {
      title: String(data.title ?? 'Untitled'),
      date: String(data.date ?? ''),
      excerpt: String(data.excerpt ?? ''),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      draft: data.draft === true,
      answer: data.answer ? String(data.answer) : undefined,
      author: String(data.author ?? 'Marius Manolachi'),
      updated: data.updated ? String(data.updated) : undefined,
      targetQuery: data.targetQuery ? String(data.targetQuery) : undefined,
      cluster: canonicalBlogCluster(data.cluster || `${data.targetQuery || ''} ${data.title || ''}`),
      parent: data.parent ? String(data.parent) : undefined,
      contentType: data.contentType ? String(data.contentType) : undefined,
      kind: data.kind ? String(data.kind) : undefined,
      sourceableAtom: data.sourceableAtom ? String(data.sourceableAtom) : undefined,
      evidenceType: data.evidenceType ? String(data.evidenceType) : undefined,
      evidenceBasis: data.evidenceBasis ? String(data.evidenceBasis) : undefined,
      nextReviewAt: data.nextReviewAt ? String(data.nextReviewAt) : undefined,
      sources: Array.isArray(data.sources) ? data.sources.map(String) : [],
      cover: data.cover ? String(data.cover) : undefined,
      coverAlt: data.coverAlt ? String(data.coverAlt) : undefined,
      faq: Array.isArray(data.faq)
        ? data.faq
          .map((item: { q?: unknown; a?: unknown }) => ({ q: String(item?.q || '').trim(), a: String(item?.a || '').trim() }))
          .filter((item: { q: string; a: string }) => item.q && item.a)
        : undefined,
    },
    content: content.trim(),
    readingTime: readingTimeFor(content),
  };
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  return readdirSync(BLOG_DIRECTORY)
    .filter((fileName) => fileName.endsWith('.mdx') && !fileName.startsWith('_'))
    .map(parsePost)
    .filter((post) => !post.metadata.draft && post.metadata.date)
    .sort((a, b) => b.metadata.date.localeCompare(a.metadata.date));
}

export async function getBlogPost(slug: string): Promise<BlogPost | undefined> {
  if (!SAFE_SLUG.test(slug)) return undefined;

  try {
    const post = parsePost(`${slug}.mdx`);
    return post.metadata.draft ? undefined : post;
  } catch {
    return undefined;
  }
}

export async function getPostsByCluster(cluster: string): Promise<BlogPost[]> {
  if (!BLOG_CLUSTERS.some((item) => item.id === cluster)) return [];
  return (await getAllBlogPosts()).filter((post) => post.metadata.cluster === cluster);
}
