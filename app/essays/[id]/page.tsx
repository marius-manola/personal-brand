import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { getEssayById, getAllEssays } from '@/lib/server/essays.server';

interface PageProps {
  params: {
    id: string;
  };
}

// Generate static params for all essays at build time
export async function generateStaticParams() {
  const essays = await getAllEssays();
  return essays.map((essay) => ({
    id: essay.id,
  }));
}

export default async function EssayPage({ params }: PageProps) {
  // Destructure and await params at the top level
  const { id } = await Promise.resolve(params);
  const essay = await getEssayById(id);

  if (!essay) {
    notFound();
  }

  const formattedDate = new Date(essay.metadata.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <>
      <MobileNavigation />
      
      <div className="min-h-screen bg-white">
        <div className="flex justify-center">
          <main className="max-w-md w-full px-6 py-24">
            <div className="space-y-12">
              <header>
                <h1 className="text-2xl font-light text-gray-900 mb-1">
                  {essay.metadata.title}
                </h1>
                <div className="text-xs text-gray-400">
                  {formattedDate}
                </div>
              </header>

              <div className="prose prose-sm whitespace-pre-wrap
                [&>*]:mt-0 
                [&>*+*]:mt-4
                [&>p]:text-gray-600 [&>p]:leading-relaxed
                [&>p:first-of-type]:text-xl [&>p:first-of-type]:font-light [&>p:first-of-type]:text-gray-900 [&>p:first-of-type]:mb-8
                [&>p>strong]:font-medium [&>p>strong]:text-gray-900
                [&>p+p]:not-first-of-type:border-t [&>p+p]:not-first-of-type:border-gray-50 [&>p+p]:not-first-of-type:pt-4

                [&>ol]:list-none [&>ol]:pl-0 [&>ol]:my-2 
                [&>ol>li]:text-gray-600 [&>ol>li]:leading-relaxed [&>ol>li]:font-medium 
                [&>ol>li]:pl-6 [&>ol>li]:relative [&>ol>li]:py-0.5
                [&>ol>li]:before:content-[counter(list-item)_')'] 
                [&>ol>li]:before:absolute [&>ol>li]:before:left-0 
                [&>ol>li]:before:text-gray-400 [&>ol>li]:before:font-normal

                prose-headings:font-light prose-headings:text-gray-900
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4

                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:font-medium prose-strong:text-gray-900
                prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:my-4
                prose-blockquote:border-l-4 prose-blockquote:border-gray-200 prose-blockquote:pl-4 
                prose-blockquote:italic prose-blockquote:text-gray-600 prose-blockquote:my-4

                [&>p]:first-line:font-medium [&>p]:first-line:text-gray-900

                [&_p:has(+ol)]:mb-2
                [&_ol:has(+p)]:mb-4
                [&_h2:has(+ol)]:mb-2
                [&_h2:has(+p)]:mb-2">
                <MDXRemote source={essay.content} />
              </div>

              <footer className="text-xs text-gray-400 pt-8 border-t border-gray-100">
                <p>© 2025 Marius Manolachi</p>
              </footer>
            </div>
          </main>
          
          <DesktopNavigation />
        </div>
      </div>
    </>
  );
}