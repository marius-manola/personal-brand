import Image from 'next/image';
import Link from 'next/link';
import Copyright from '@/app/components/Copyright';
import { localBlogImageSize } from '@/lib/server/blog-image';
import { BLOG_CLUSTERS, getAllBlogPosts, type BlogPost } from '@/lib/server/blog.server';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function PostCover({ post, className, priority = false }: { post: BlogPost; className: string; priority?: boolean }) {
  const src = post.metadata.cover;
  if (!src) return null;
  const { width, height } = localBlogImageSize(src);

  return (
    <Image
      className={className}
      src={src}
      alt={post.metadata.coverAlt || `Cover illustration for ${post.metadata.title}`}
      width={width}
      height={height}
      sizes="(max-width: 767px) 100vw, 240px"
      priority={priority}
    />
  );
}

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="blog-shell">
      <main className="m-blog-index mobile-experience">
        <header className="m-index-topbar">
          <Link href="/">Marius Manolachi</Link>
          <a href="/blog/rss.xml">RSS</a>
        </header>
        <section className="m-index-hero">
          <p>Field notes for people shipping AI</p>
          <h1>Useful before<br />it is impressive.</h1>
          <span>Evidence, decisions, failures, and build notes for small teams.</span>
        </section>

        {posts[0] && (
          <article className="m-index-featured">
            <Link href={`/blog/${posts[0].slug}`}>
              <PostCover post={posts[0]} className="m-index-featured-cover" priority />
              <div className="m-index-featured-copy">
                <div className="m-index-featured-meta">
                  <span>Latest</span>
                  <span>{posts[0].readingTime} min</span>
                </div>
                <h2>{posts[0].metadata.title}</h2>
                <p>{posts[0].metadata.excerpt}</p>
                <strong>Read the field note <span aria-hidden="true">→</span></strong>
              </div>
            </Link>
          </article>
        )}

        {posts.length > 1 && (
          <section className="m-index-feed" aria-label="All field notes">
            <div className="m-index-feed-head">
              <h2>Keep going</h2>
              <span>{posts.length - 1} notes</span>
            </div>
            {posts.slice(1).map((post, index) => (
              <article key={post.slug} className="m-index-row">
                <Link href={`/blog/${post.slug}`}>
                  <span className="m-index-number">{String(index + 1).padStart(2, '0')}</span>
                  <PostCover post={post} className="m-index-row-cover" />
                  <div>
                    <p>{post.metadata.cluster || post.metadata.tags[0] || 'AI products'} · {post.readingTime} min</p>
                    <h3>{post.metadata.title}</h3>
                  </div>
                  <span className="m-index-arrow" aria-hidden="true">↗</span>
                </Link>
              </article>
            ))}
          </section>
        )}

        <footer className="m-index-footer">
          <span>© <Copyright /> Marius Manolachi</span>
          <Link href="/learn-ai">Work with me</Link>
        </footer>
      </main>

      <main className="blog-main desktop-experience">
        <header className="blog-header">
          <Link href="/" className="blog-kicker">Marius Manolachi</Link>
          <h1 className="blog-title">Blog</h1>
          <p className="blog-intro">Notes on building, learning, and technology.</p>
        </header>

        <nav className="blog-cluster-nav" aria-label="Browse by topic">
          {BLOG_CLUSTERS.map((cluster) => (
            <Link key={cluster.id} href={`/blog/topic/${cluster.id}`}>{cluster.label}</Link>
          ))}
        </nav>

        {posts.length > 0 ? (
          <section className="blog-index" aria-label="Blog posts">
            {posts.map((post) => (
              <article key={post.slug} className="blog-index-item">
                <Link href={`/blog/${post.slug}`} className="blog-post-link">
                  <div className="blog-post-copy">
                    <div className="blog-post-meta">
                      <time dateTime={post.metadata.date}>
                        {dateFormatter.format(new Date(`${post.metadata.date}T00:00:00Z`))}
                      </time>
                      <span aria-hidden="true">·</span>
                      <span>{post.readingTime} min read</span>
                    </div>
                    <h2>{post.metadata.title}</h2>
                    <p>{post.metadata.excerpt}</p>
                    {post.metadata.tags.length > 0 && (
                      <ul className="blog-tags" aria-label="Topics">
                        {post.metadata.tags.map((tag) => <li key={tag}>{tag}</li>)}
                      </ul>
                    )}
                  </div>
                  <PostCover post={post} className="blog-index-cover" />
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <section className="blog-empty">
            <p>The first post is being written.</p>
          </section>
        )}

        <footer className="blog-footer">
          <span>© <Copyright /> Marius Manolachi</span>
          <div>
            <Link href="/">Home</Link>
            <a href="/blog/rss.xml">RSS</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
