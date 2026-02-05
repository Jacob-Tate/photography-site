import { useState, useRef, useEffect, forwardRef, CSSProperties } from 'react';
import { ImageInfo } from '../api/client';

interface PhotoCardProps {
  image: ImageInfo;
  onClick: () => void;
  focused?: boolean;
  gridStyle?: CSSProperties;
  center?: boolean;
}

const PhotoCard = forwardRef<HTMLDivElement, PhotoCardProps>(function PhotoCard({ image, onClick, focused, gridStyle, center }, forwardedRef) {
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
      className={`cursor-pointer group relative overflow-hidden rounded-sm${center ? ' flex items-center' : ''}${focused ? ' ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
      style={gridStyle}
      onClick={onClick}
    >
      {visible && (
        <img
          src={image.thumbnailUrl}
          alt={image.filename}
          className={`w-full ${center ? '' : 'h-full'} object-cover transition-all duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-105`}
          onLoad={() => setLoaded(true)}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
      )}
    </div>
  );
});

export default PhotoCard;
