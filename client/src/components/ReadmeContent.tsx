import { useEffect, useRef } from 'react';
import { ImageInfo } from '../api/client';

interface ReadmeContentProps {
  html: string;
  images: ImageInfo[];
  onImageClick: (index: number) => void;
}

export default function ReadmeContent({ html, images, onImageClick }: ReadmeContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a.readme-lightbox');
      if (!link) return;

      e.preventDefault();
      const filename = link.getAttribute('data-lightbox-image');
      if (!filename) return;

      // Find the image index by filename
      const index = images.findIndex(img => img.filename === filename);
      if (index !== -1) {
        onImageClick(index);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [images, onImageClick]);

  return (
    <div
      ref={containerRef}
      className="prose prose-invert prose-sm max-w-none mb-6 text-neutral-300"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
