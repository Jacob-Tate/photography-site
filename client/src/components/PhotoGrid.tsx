import { useEffect, useState, useCallback, useRef, createRef } from 'react';
import { ImageInfo } from '../api/client';
import PhotoCard from './PhotoCard';

interface PhotoGridProps {
  images: ImageInfo[];
  onPhotoClick: (index: number) => void;
  lightboxOpen?: boolean;
}

export default function PhotoGrid({ images, onPhotoClick, lightboxOpen }: PhotoGridProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cardRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);

  // Keep refs array in sync with images
  if (cardRefs.current.length !== images.length) {
    cardRefs.current = images.map((_, i) => cardRefs.current[i] || createRef<HTMLDivElement>());
  }

  const scrollToIndex = useCallback((index: number) => {
    const el = cardRefs.current[index]?.current;
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.min(prev + 1, images.length - 1);
          scrollToIndex(next);
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.max(prev - 1, 0);
          scrollToIndex(next);
          return next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (focusedIndex !== null) {
          e.preventDefault();
          onPhotoClick(focusedIndex);
        }
      } else if (e.key === 'Escape') {
        setFocusedIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, focusedIndex, images.length, onPhotoClick, scrollToIndex]);

  // Clear focus when lightbox opens
  useEffect(() => {
    if (lightboxOpen) {
      setFocusedIndex(null);
    }
  }, [lightboxOpen]);

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4 p-3 sm:p-4 safe-left safe-right">
      {images.map((image, index) => (
        <PhotoCard
          key={image.path}
          ref={cardRefs.current[index]}
          image={image}
          onClick={() => onPhotoClick(index)}
          focused={focusedIndex === index}
        />
      ))}
    </div>
  );
}
