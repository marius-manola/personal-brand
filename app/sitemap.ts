import type { MetadataRoute } from 'next';
import { getAllBlogPosts } from '@/lib/server/blog.server';
import { getAllEssays } from '@/lib/server/essays.server';

const SITE_URL = 'https://mariusmanolachi.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, essays] = await Promise.all([getAllBlogPosts(), getAllEssays()]);
  const staticRoutes = ['', '/about', '/books', '/essays', '/learn-ai', '/projects', '/stats', '/blog'];

  return [
    ...staticRoutes.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'monthly' as const })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.metadata.updated || post.metadata.date,
      changeFrequency: 'monthly' as const,
    })),
    ...essays.map((essay) => ({
      url: `${SITE_URL}/essays/${essay.id}`,
      lastModified: essay.metadata.date,
      changeFrequency: 'yearly' as const,
    })),
  ];
}
