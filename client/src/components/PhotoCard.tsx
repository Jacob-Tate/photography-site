import { useState, useRef, useEffect, forwardRef } from 'react';
import { ImageInfo } from '../api/client';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface PhotoCardProps {
  image: ImageInfo;
  onClick: () => void;
  focused?: boolean;
  rowSpan?: number;
}

const PhotoCard = forwardRef<HTMLDivElement, PhotoCardProps>(function PhotoCard({ image, onClick, focused, rowSpan }, forwardedRef) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = (forwardedRef as React.RefObject<HTMLDivElement>) || internalRef;

  useEffect(() => {
    const el = (ref as React.RefObject<HTMLDivElement>).current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '2000px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`cursor-pointer group relative overflow-hidden rounded-sm${focused ? ' ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
      style={rowSpan ? { gridRowEnd: `span ${rowSpan}` } : undefined}
      onClick={onClick}
    >
      {visible && (
        <img
          src={image.thumbnailUrl}
          alt={image.filename}
          className={`w-full h-full object-cover transition-all duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-105`}
          onLoad={() => setLoaded(true)}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
      )}
      {image.type === 'video' && (
        <div className="absolute bottom-2 left-2 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          {image.duration !== undefined && (
            <span className="text-white text-xs">{formatDuration(image.duration)}</span>
          )}
        </div>
      )}
    </div>
  );
});

export default PhotoCard;
