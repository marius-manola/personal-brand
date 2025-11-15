import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

// ESSAYS_DIRECTORY is relative to the project root
const ESSAYS_DIRECTORY = join(process.cwd(), 'content/essays');

interface EssayMetadata {
  title: string;
  date: string;
  excerpt: string;
}

export interface Essay {
  id: string;
  metadata: EssayMetadata;
  content: string;
}

export async function getAllEssays(): Promise<Essay[]> {
  // Get file names under /content/essays
  const fileNames = readdirSync(ESSAYS_DIRECTORY);
  const allEssaysData = fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      // Remove ".mdx" from file name to get id
      const id = fileName.replace(/\.mdx$/, '');

      // Read markdown file as string
      const fullPath = join(ESSAYS_DIRECTORY, fileName);
      const fileContents = readFileSync(fullPath, 'utf8');

      // Use gray-matter to parse the post metadata section
      const { data, content } = matter(fileContents);

      return {
        id,
        metadata: {
          title: data.title,
          date: data.date,
          excerpt: data.excerpt,
        },
        content: content.trim(),
      };
    });

  // Sort posts by date
  return allEssaysData.sort((a, b) => {
    if (a.metadata.date < b.metadata.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export async function getEssayById(id: string): Promise<Essay | undefined> {
  try {
    const fullPath = join(ESSAYS_DIRECTORY, `${id}.mdx`);
    const fileContents = readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      id,
      metadata: {
        title: data.title,
        date: data.date,
        excerpt: data.excerpt,
      },
      content: content.trim(),
    };
  } catch {
    return undefined;
  }
} 