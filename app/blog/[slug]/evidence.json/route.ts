import { getBlogPost } from '@/lib/server/blog.server';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({
    url: `${SITE_URL}/blog/${post.slug}`,
    title: post.metadata.title,
    targetQuery: post.metadata.targetQuery,
    contentType: post.metadata.contentType,
    evidence: {
      type: post.metadata.evidenceType,
      basis: post.metadata.evidenceBasis,
      sourceableAtom: post.metadata.sourceableAtom,
    },
    sources: post.metadata.sources,
    published: post.metadata.date,
    updated: post.metadata.updated || post.metadata.date,
    limitations: 'Read the method and limitations in the article. This manifest describes provenance; it is not a substitute for the underlying evidence.',
  }, {
    headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
  });
}
