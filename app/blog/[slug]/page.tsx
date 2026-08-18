import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Copyright from '@/app/components/Copyright';
import { getAllBlogPosts, getBlogPost, prepareBlogMdx } from '@/lib/server/blog.server';
import { isLocalBlogImage, localBlogImageSize } from '@/lib/server/blog-image';

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

function tableCells(line: string) {
  return line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell) =>
    cell.trim()
      .replace(/\\\|/g, '|')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)'),
  );
}

function withBlogTables(source: string) {
  const lines = source.split('\n');
  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index];
    const separator = lines[index + 1];
    if (header.includes('|') && separator && /^\s*\|?\s*:?-{3,}/.test(separator)) {
      const headers = tableCells(header);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      const data = encodeURIComponent(JSON.stringify({ headers, rows }));
      output.push(`<BlogTable data="${data}" />`);
      if (index < lines.length) output.push(lines[index]);
    } else {
      output.push(header);
    }
  }
  return output.join('\n');
}

function BlogImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;
  if (!isLocalBlogImage(src)) {
    return <img src={src} alt={alt || ''} loading="lazy" decoding="async" />;
  }
  const { width, height } = localBlogImageSize(src);
  return (
    <Image
      src={src}
      alt={alt || ''}
      width={width}
      height={height}
      sizes="(max-width: 832px) 100vw, 768px"
      quality={70}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

function BlogTable({ data }: { data: string }) {
  const parsed = JSON.parse(decodeURIComponent(data)) as { headers: string[]; rows: string[][] };
  return (
    <table>
      <thead><tr>{parsed.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{parsed.rows.map((row, rowIndex) => (
        <tr key={rowIndex}>{parsed.headers.map((_, cellIndex) => <td key={cellIndex}>{row[cellIndex] || ''}</td>)}</tr>
      ))}</tbody>
    </table>
  );
}

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
        speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.blog-answer'] },
      },
      ...(post.metadata.faq?.length ? [{
        '@type': 'FAQPage',
        mainEntity: post.metadata.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }] : []),
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
              <Image
                src={post.metadata.cover}
                alt={post.metadata.coverAlt || ''}
                width={localBlogImageSize(post.metadata.cover).width}
                height={localBlogImageSize(post.metadata.cover).height}
                sizes="(max-width: 832px) 100vw, 768px"
                quality={70}
                priority
                style={{ width: '100%', height: 'auto' }}
              />
            </figure>
          )}

          <div className="blog-prose">
            <MDXRemote
              source={withBlogTables(prepareBlogMdx(post.content))}
              components={{ img: BlogImage, Image: BlogImage, BlogTable }}
            />
          </div>

          {post.metadata.faq && post.metadata.faq.length > 0 && (
            <section className="blog-faq" aria-labelledby="faq-heading">
              <h2 id="faq-heading">Questions people ask next</h2>
              {post.metadata.faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </section>
          )}
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
