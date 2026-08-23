import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { isLocalRequest } from '@/lib/content-studio/local-only';
import { readDraftPreview } from '@/lib/content-studio/preview';
import { prepareBlogMdx } from '@/lib/server/blog.server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ id: string }> };

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

function PreviewImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src || /__\w+_IMAGE/.test(src)) {
    return <p style={{ color: '#5c5346', fontSize: 13 }}>Image not generated yet.</p>;
  }
  return <img src={src} alt={alt || ''} style={{ width: '100%', height: 'auto' }} />;
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

export default async function DraftPreviewPage({ params }: PageProps) {
  if (!(await isLocalRequest())) notFound();
  const { id } = await params;
  const draft = await readDraftPreview(id);
  if (!draft) notFound();

  return (
    <main className="blog-shell" style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 64px' }}>
      <p style={{ margin: 0, color: '#5c5346', fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        Draft · not live · {draft.wordCount.toLocaleString()} words
      </p>
      <h1 style={{ margin: '8px 0 12px', fontSize: '2rem', lineHeight: 1.15 }}>{draft.title}</h1>
      {draft.excerpt && <p style={{ color: '#3f4b44' }}>{draft.excerpt}</p>}
      {draft.answer && (
        <aside className="blog-answer" aria-labelledby="quick-answer-heading">
          <h2 id="quick-answer-heading">Quick answer</h2>
          <p>{draft.answer}</p>
        </aside>
      )}
      <div className="blog-prose">
        <MDXRemote
          source={withBlogTables(prepareBlogMdx(draft.content))}
          components={{ img: PreviewImage, Image: PreviewImage, BlogTable }}
        />
      </div>
    </main>
  );
}
