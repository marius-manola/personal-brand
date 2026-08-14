import Link from 'next/link';
import Copyright from '@/app/components/Copyright';
import { getAllBlogPosts } from '@/lib/server/blog.server';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export default async function BlogPage() {
  const posts = await getAllBlogPosts();

  return (
    <div className="blog-shell">
      <main className="blog-main">
        <header className="blog-header">
          <Link href="/" className="blog-kicker">Marius Manolachi</Link>
          <h1 className="blog-title">Blog</h1>
          <p className="blog-intro">Notes on building, learning, and technology.</p>
        </header>

        {posts.length > 0 ? (
          <section className="blog-index" aria-label="Blog posts">
            {posts.map((post) => (
              <article key={post.slug} className="blog-index-item">
                <Link href={`/blog/${post.slug}`} className="blog-post-link">
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
