export interface EssayMetadata {
  title: string;
  date: string;
  excerpt: string;
}

export interface Essay {
  id: string;
  metadata: EssayMetadata;
  content: string;
}

// This type helps with MDX imports
export interface MDXContent {
  title: string;
  date: string;
  excerpt: string;
  content: string;
}

// The actual essay data will be imported from MDX files at build time
// This is just a type definition for the collection
export type Essays = Essay[];

// Helper function to format the essay data
export function formatEssay(id: string, { title, date, excerpt, content }: MDXContent): Essay {
  return {
    id,
    metadata: {
      title,
      date,
      excerpt,
    },
    content
  };
}

// These functions will be implemented in the server utilities
export async function getAllEssays(): Promise<Essay[]> {
  throw new Error('This function should be implemented in server utilities');
}

export async function getEssayById(): Promise<Essay | undefined> {
  throw new Error('This function should be implemented in server utilities');
} 