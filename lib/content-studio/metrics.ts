import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { getAllBlogPosts } from '@/lib/server/blog.server';
import { wordCount } from './conversation.mjs';
import { runtimePath, type StudioSettings, type StudioState } from './state';

export type PublishedPostMetric = {
  slug: string;
  title: string;
  date: string;
  wordCount: number;
  readingTime: number;
  imageCount: number;
  liveUrl: string;
};

export type StudioMetrics = {
  today: string;
  publishedToday: number;
  targetToday: number;
  remainingToday: number;
  totalPublished: number;
  currentWordCount: number;
  currentImageCount: number;
  history: PublishedPostMetric[];
};

function todayInBerlin() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function inlineImageCount(content: string) {
  return (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length
    + (content.match(/<(?:img|Image)\b/g) || []).length;
}

async function currentDraftMetrics(state: StudioState) {
  if (!state.id) return { currentWordCount: 0, currentImageCount: 0 };
  try {
    const source = await readFile(runtimePath('jobs', state.id, 'post.mdx'), 'utf8');
    const body = matter(source).content;
    return {
      currentWordCount: wordCount(body),
      currentImageCount: state.images?.length ?? (state.imagePath ? 1 : 0),
    };
  } catch {
    return { currentWordCount: 0, currentImageCount: state.images?.length ?? (state.imagePath ? 1 : 0) };
  }
}

export async function getStudioMetrics(state: StudioState, settings: StudioSettings): Promise<StudioMetrics> {
  const posts = await getAllBlogPosts();
  const history = posts.map((post) => ({
    slug: post.slug,
    title: post.metadata.title,
    date: post.metadata.date,
    wordCount: wordCount(post.content),
    readingTime: post.readingTime,
    imageCount: inlineImageCount(post.content) + (post.metadata.cover ? 1 : 0),
    liveUrl: `https://mariusmanolachi.com/blog/${post.slug}`,
  }));
  const today = todayInBerlin();
  const publishedToday = history.filter((post) => post.date === today).length;
  const targetToday = settings.enabled ? settings.postsPerDay : 0;
  const current = await currentDraftMetrics(state);

  return {
    today,
    publishedToday,
    targetToday,
    remainingToday: Math.max(0, targetToday - publishedToday),
    totalPublished: history.length,
    ...current,
    history,
  };
}
