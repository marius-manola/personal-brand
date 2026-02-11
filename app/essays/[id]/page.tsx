import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import MobileNavigation, { DesktopNavigation } from '@/components/Navigation';
import { getEssayById, getAllEssays } from '@/lib/server/essays.server';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
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
      
      <div className="page-shell" style={{ scrollbarGutter: 'stable' }}>
        <div className="flex justify-center">
          <main className="page-main">
            <div className="page-stack">
              <header className="page-header">
                <h1 className="page-title">
                  {essay.metadata.title}
                </h1>
                <div className="page-subtitle">
                  {formattedDate}
                </div>
              </header>

              <div className="prose prose-sm whitespace-pre-wrap
                [&>*]:mt-0 
                [&>*+*]:mt-5

                [&>p]:text-[hsl(var(--card-foreground)/0.85)] [&>p]:leading-[1.95] [&>p]:font-[330]
                [&>p:first-of-type]:text-[1.15rem] [&>p:first-of-type]:text-[hsl(var(--foreground))] [&>p:first-of-type]:mb-8 [&>p:first-of-type]:font-[380]
                [&>p+p]:not-first-of-type:border-t [&>p+p]:not-first-of-type:border-[hsl(var(--border)/0.35)] [&>p+p]:not-first-of-type:pt-5

                [&>ol]:list-none [&>ol]:pl-0 [&>ol]:my-1
                [&>ol>li]:text-[hsl(var(--card-foreground)/0.85)] [&>ol>li]:leading-relaxed [&>ol>li]:font-light
                [&>ol>li]:pl-8 [&>ol>li]:relative [&>ol>li]:py-0.5
                [&>ol>li]:before:content-[counter(list-item)_')'] 
                [&>ol>li]:before:absolute [&>ol>li]:before:left-0 
                [&>ol>li]:before:text-[hsl(var(--muted-foreground))] [&>ol>li]:before:font-thin

                [&>h2]:text-[1.55rem] [&>h2]:font-medium [&>h2]:mt-10 [&>h2]:mb-4

                [&>a]:text-[hsl(var(--foreground))] [&>a]:underline [&>a]:underline-offset-[3px] [&>a]:decoration-[hsl(var(--border))] hover:[&>a]:decoration-[hsl(var(--ring))] [&>a]:font-medium
                [&>strong]:font-semibold [&>strong]:text-[hsl(var(--foreground))]
                [&>code]:text-[hsl(var(--foreground))] [&>code]:bg-[hsl(var(--secondary)/0.6)] [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-medium
                [&>pre]:bg-[hsl(var(--foreground))] [&>pre]:text-[hsl(var(--background))] [&>pre]:my-4 [&>pre]:p-4 [&>pre]:rounded [&>pre]:font-normal
                [&>blockquote]:border-l-2 [&>blockquote]:border-[hsl(var(--border))] [&>blockquote]:pl-4 
                [&>blockquote]:italic [&>blockquote]:text-[hsl(var(--muted-foreground))] [&>blockquote]:my-4 [&>blockquote]:font-light

                [&_p:has(+ol)]:mb-2
                [&_ol:has(+p)]:mb-6
                [&_h2:has(+ol)]:mb-2
                [&_h2:has(+p)]:mb-2

                [&>ol:has(li[value])]:space-y-3">
                <MDXRemote source={essay.content} />
              </div>

              <footer className="page-footer">
                <p>
                  © {new Date().getFullYear()} Marius Manolachi
                </p>
              </footer>
            </div>
          </main>
          
          <DesktopNavigation />
        </div>
      </div>
    </>
  );
}
