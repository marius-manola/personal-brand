import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { getEssayById, getAllEssays } from '@/lib/server/essays.server';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: { [key: string]: string | string[] | undefined };
}

// Generate static params for all essays at build time
export async function generateStaticParams() {
  const essays = await getAllEssays();
  return essays.map((essay) => ({
    id: essay.id,
  }));
}

export default async function EssayPage({ params }: PageProps) {
  const { id } = await params;
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
                [&>p:first-of-type]:text-lg [&>p:first-of-type]:text-gray-800 [&>p:first-of-type]:mb-8
                [&>p+p]:not-first-of-type:border-t [&>p+p]:not-first-of-type:border-gray-50 [&>p+p]:not-first-of-type:pt-4

                [&>ol]:list-none [&>ol]:pl-0 [&>ol]:my-1
                [&>ol>li]:text-gray-600 [&>ol>li]:leading-relaxed
                [&>ol>li]:pl-8 [&>ol>li]:relative [&>ol>li]:py-0.5
                [&>ol>li]:before:content-[counter(list-item)_')'] 
                [&>ol>li]:before:absolute [&>ol>li]:before:left-0 
                [&>ol>li]:before:text-gray-400

                [&>h2]:text-lg [&>h2]:text-gray-800 [&>h2]:font-light [&>h2]:mt-8 [&>h2]:mb-3

                [&>a]:text-blue-600 [&>a]:no-underline hover:[&>a]:underline
                [&>strong]:font-medium [&>strong]:text-gray-800
                [&>code]:text-blue-600 [&>code]:bg-blue-50 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded
                [&>pre]:bg-gray-900 [&>pre]:text-gray-100 [&>pre]:my-4 [&>pre]:p-4 [&>pre]:rounded
                [&>blockquote]:border-l-4 [&>blockquote]:border-gray-200 [&>blockquote]:pl-4 
                [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:my-4

                [&_p:has(+ol)]:mb-2
                [&_ol:has(+p)]:mb-6
                [&_h2:has(+ol)]:mb-2
                [&_h2:has(+p)]:mb-2

                [&>ol:has(li[value])]:space-y-3">
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