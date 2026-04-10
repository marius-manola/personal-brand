interface YouTubeEmbedProps {
  url: string;
  title?: string;
  caption?: string;
  className?: string;
}

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsedUrl.hostname.includes('youtube.com')) {
      if (parsedUrl.pathname === '/watch') {
        const videoId = parsedUrl.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }

      if (parsedUrl.pathname.startsWith('/shorts/')) {
        const videoId = parsedUrl.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }

      if (parsedUrl.pathname.startsWith('/embed/')) {
        return `https://www.youtube.com${parsedUrl.pathname}`;
      }
    }
  } catch {
    return url;
  }

  return url;
}

export default function YouTubeEmbed({
  url,
  title = 'YouTube video player',
  caption,
  className = '',
}: YouTubeEmbedProps) {
  const embedUrl = getYouTubeEmbedUrl(url);

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div className="overflow-hidden rounded-[0.4rem] border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--secondary)/0.45)] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]">
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>

      {(caption || url) && (
        <div className="flex flex-col gap-2 text-sm text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between">
          {caption ? <p className="page-body text-sm leading-relaxed">{caption}</p> : <span />}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link w-fit text-[0.72rem]"
          >
            Watch on YouTube
          </a>
        </div>
      )}
    </div>
  );
}
