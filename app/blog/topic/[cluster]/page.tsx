import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Copyright from '@/app/components/Copyright';
import { BLOG_CLUSTERS, getPostsByCluster } from '@/lib/server/blog.server';

type Props = { params: Promise<{ cluster: string }> };

export function generateStaticParams() {
  return BLOG_CLUSTERS.map(({ id }) => ({ cluster: id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cluster } = await params;
  const item = BLOG_CLUSTERS.find((candidate) => candidate.id === cluster);
  if (!item) return {};
  return {
    title: `${item.label} field notes`,
    description: item.description,
    alternates: { canonical: `/blog/topic/${item.id}` },
  };
}

export default async function ClusterPage({ params }: Props) {
  const { cluster } = await params;
  const item = BLOG_CLUSTERS.find((candidate) => candidate.id === cluster);
  if (!item) notFound();
  const posts = await getPostsByCluster(cluster);

  return (
    <div className="blog-shell">
      <main className="blog-main">
        <nav className="blog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/blog">Blog</Link><span aria-hidden="true">/</span><span>{item.label}</span>
        </nav>
        <header className="blog-header">
          <p className="blog-kicker">Topic collection</p>
          <h1 className="blog-title">{item.label}</h1>
          <p className="blog-intro">{item.description}</p>
        </header>
        <section className="blog-index" aria-label={`${item.label} articles`}>
          {posts.map((post, index) => (
            <article key={post.slug} className="blog-index-item">
              <Link href={`/blog/${post.slug}`} className="blog-post-link">
                <div className="blog-post-meta">
                  <span>{index === 0 ? 'Start here' : post.metadata.contentType || 'Field note'}</span>
                  <span aria-hidden="true">·</span><span>{post.readingTime} min read</span>
                </div>
                <h2>{post.metadata.title}</h2>
                <p>{post.metadata.excerpt}</p>
              </Link>
            </article>
          ))}
        </section>
        <footer className="blog-footer">
          <span>© <Copyright /> Marius Manolachi</span>
          <Link href="/blog">All topics</Link>
        </footer>
      </main>
    </div>
  );
}
