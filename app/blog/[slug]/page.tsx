import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Copyright from '@/app/components/Copyright';
import { getAllBlogPosts, getBlogPost } from '@/lib/server/blog.server';

const SITE_URL = 'https://mariusmanolachi.com';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) return {};

  return {
    title: post.metadata.title,
    description: post.metadata.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.metadata.title,
      description: post.metadata.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.metadata.date,
      tags: post.metadata.tags,
      images: post.metadata.cover ? [{ url: post.metadata.cover, alt: post.metadata.coverAlt || post.metadata.title }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPost(slug), getAllBlogPosts()]);

  if (!post) notFound();

  const currentIndex = posts.findIndex((item) => item.slug === post.slug);
  const newerPost = currentIndex > 0 ? posts[currentIndex - 1] : undefined;
  const olderPost = currentIndex >= 0 ? posts[currentIndex + 1] : undefined;
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.metadata.title,
        description: post.metadata.excerpt,
        datePublished: post.metadata.date,
        dateModified: post.metadata.updated || post.metadata.date,
        author: { '@type': 'Person', name: post.metadata.author, url: `${SITE_URL}/about` },
        mainEntityOfPage: postUrl,
        articleSection: post.metadata.cluster,
        keywords: post.metadata.tags,
        citation: post.metadata.sources,
        image: post.metadata.cover ? `${SITE_URL}${post.metadata.cover}` : undefined,
        url: postUrl,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 2, name: post.metadata.title, item: postUrl },
        ],
      },
    ],
  };

  return (
    <div className="blog-shell">
      <main className="blog-main blog-article-main">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />

        <nav className="blog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/blog">Blog</Link>
          <span aria-hidden="true">/</span>
          <Link href="/">Marius Manolachi</Link>
        </nav>

        <article>
          <header className="blog-article-header">
            <div className="blog-post-meta">
              <time dateTime={post.metadata.date}>
                {longDateFormatter.format(new Date(`${post.metadata.date}T00:00:00Z`))}
              </time>
              <span aria-hidden="true">·</span>
              <span>{post.readingTime} min read</span>
              <span aria-hidden="true">·</span>
              <Link href="/about" rel="author">{post.metadata.author}</Link>
            </div>
            <h1>{post.metadata.title}</h1>
            <p>{post.metadata.excerpt}</p>
            {post.metadata.tags.length > 0 && (
              <ul className="blog-tags" aria-label="Topics">
                {post.metadata.tags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            )}
          </header>

          {post.metadata.answer && (
            <aside className="blog-answer" aria-labelledby="quick-answer-heading">
              <h2 id="quick-answer-heading">Quick answer</h2>
              <p>{post.metadata.answer}</p>
            </aside>
          )}

          {post.metadata.cover && (
            <figure className="blog-cover">
              <Image src={post.metadata.cover} alt={post.metadata.coverAlt || ''} width={1600} height={900} sizes="(max-width: 832px) 100vw, 768px" />
            </figure>
          )}

          <div className="blog-prose">
            <MDXRemote source={post.content} />
          </div>
        </article>

        {(newerPost || olderPost) && (
          <nav className="blog-pagination" aria-label="More posts">
            {olderPost ? (
              <Link href={`/blog/${olderPost.slug}`}>
                <span>Older</span>
                {olderPost.metadata.title}
              </Link>
            ) : <span />}
            {newerPost && (
              <Link href={`/blog/${newerPost.slug}`} className="blog-pagination-newer">
                <span>Newer</span>
                {newerPost.metadata.title}
              </Link>
            )}
          </nav>
        )}

        <footer className="blog-footer">
          <span>© <Copyright /> Marius Manolachi</span>
          <div>
            <Link href="/blog">All posts</Link>
            <a href="/blog/rss.xml">RSS</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
