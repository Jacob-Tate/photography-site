import { useState } from 'react';

interface ShareButtonProps {
  type: 'album' | 'image';
  targetPath: string;
  compact?: boolean;
}

function buildShareUrl(type: 'album' | 'image', targetPath: string): string {
  if (type === 'album') {
    return `${window.location.origin}/${targetPath}`;
  }
  // targetPath is like "albums/test123/image.jpg" or "portfolio/image.jpg"
  const lastSlash = targetPath.lastIndexOf('/');
  const parentPath = targetPath.substring(0, lastSlash);
  const filename = targetPath.substring(lastSlash + 1);
  // Portfolio images live at / not /portfolio
  const pagePath = parentPath === 'portfolio' ? '' : `/${parentPath}`;
  return `${window.location.origin}${pagePath}?image=${encodeURIComponent(filename)}`;
}

export default function ShareButton({ type, targetPath, compact }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildShareUrl(type, targetPath);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className="p-3 sm:p-2 text-white/70 hover:text-white transition-colors touch-target"
        aria-label="Copy share link"
      >
        {copied ? (
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md text-white transition-colors"
    >
      {copied ? (
        <>
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
