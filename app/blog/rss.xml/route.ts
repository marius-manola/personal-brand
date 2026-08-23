import { getAllBlogPosts } from '@/lib/server/blog.server';
import { SITE_URL } from '@/lib/site';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await getAllBlogPosts();
  const items = posts.map((post) => {
    const url = `${SITE_URL}/blog/${post.slug}`;
    return [
      '<item>',
      `<title>${escapeXml(post.metadata.title)}</title>`,
      `<link>${url}</link>`,
      `<guid>${url}</guid>`,
      `<pubDate>${new Date(`${post.metadata.date}T00:00:00Z`).toUTCString()}</pubDate>`,
      `<description>${escapeXml(post.metadata.excerpt)}</description>`,
      '</item>',
    ].join('');
  }).join('');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    '<title>Marius Manolachi — Blog</title>',
    `<link>${SITE_URL}/blog</link>`,
    '<description>Notes on building, learning, and technology.</description>',
    '<language>en</language>',
    items,
    '</channel></rss>',
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
