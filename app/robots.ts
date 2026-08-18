import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/content-studio' },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: '/content-studio' },
      { userAgent: 'GPTBot', allow: '/', disallow: '/content-studio' },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: '/content-studio' },
      { userAgent: 'Google-Extended', allow: '/', disallow: '/content-studio' },
      { userAgent: 'ClaudeBot', allow: '/', disallow: '/content-studio' },
      { userAgent: 'PerplexityBot', allow: '/', disallow: '/content-studio' },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: '/content-studio' },
    ],
    sitemap: 'https://mariusmanolachi.com/sitemap.xml',
  };
}
