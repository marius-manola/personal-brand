import { BLOG_CLUSTERS, getAllBlogPosts } from '@/lib/server/blog.server';
import { getAllEssays } from '@/lib/server/essays.server';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function lastmod(value?: string) {
  if (!value) return '';
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
}

function absoluteImage(path?: string) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function postImages(post: { metadata: { cover?: string; coverAlt?: string; title: string }; content: string }) {
  const images = new Map<string, string>();
  const cover = absoluteImage(post.metadata.cover);
  if (cover) images.set(cover, post.metadata.coverAlt || post.metadata.title);
  for (const match of post.content.matchAll(/!\[[^\]]*]\((\/blog\/[^)\s]+)\)/g)) {
    const url = absoluteImage(match[1]);
    if (url) images.set(url, post.metadata.title);
  }
  return [...images.entries()].slice(0, 12);
}

export async function GET() {
  const [posts, essays] = await Promise.all([getAllBlogPosts(), getAllEssays()]);
  const newest = lastmod(posts[0]?.metadata.updated || posts[0]?.metadata.date);
  const staticRoutes = [
    { path: '', changefreq: 'weekly', lastmod: newest },
    { path: '/blog', changefreq: 'daily', lastmod: newest },
    { path: '/about', changefreq: 'monthly' },
    { path: '/learn-ai', changefreq: 'monthly' },
    { path: '/essays', changefreq: 'monthly' },
    { path: '/books', changefreq: 'monthly' },
    { path: '/projects', changefreq: 'monthly' },
    { path: '/stats', changefreq: 'yearly' },
  ];

  const urls = [
    ...staticRoutes.map((route) => ({
      loc: `${SITE_URL}${route.path}`,
      lastmod: route.lastmod || '',
      changefreq: route.changefreq,
      images: [] as Array<[string, string]>,
    })),
    ...posts.map((post) => ({
      loc: `${SITE_URL}/blog/${post.slug}`,
      lastmod: lastmod(post.metadata.updated || post.metadata.date),
      changefreq: 'weekly',
      images: postImages(post),
    })),
    ...BLOG_CLUSTERS.map((cluster) => ({
      loc: `${SITE_URL}/blog/topic/${cluster.id}`,
      lastmod: newest,
      changefreq: 'daily',
      images: [] as Array<[string, string]>,
    })),
    ...essays.map((essay) => ({
      loc: `${SITE_URL}/essays/${essay.id}`,
      lastmod: lastmod(essay.metadata.date),
      changefreq: 'yearly',
      images: [] as Array<[string, string]>,
    })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls.map((entry) => {
      const imageXml = entry.images.map(([url, title]) => [
        '<image:image>',
        `<image:loc>${escapeXml(url)}</image:loc>`,
        `<image:title>${escapeXml(title)}</image:title>`,
        '</image:image>',
      ].join(''));
      return [
        '<url>',
        `<loc>${escapeXml(entry.loc)}</loc>`,
        entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '',
        `<changefreq>${entry.changefreq}</changefreq>`,
        ...imageXml,
        '</url>',
      ].filter(Boolean).join('');
    }),
    '</urlset>',
  ].join('');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
