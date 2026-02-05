import { useEffect, useLayoutEffect, useState, useCallback, useRef, createRef } from 'react';
import { ImageInfo } from '../api/client';
import PhotoCard from './PhotoCard';

const BASE_ROW = 4; // Small base unit (px) for fine-grained aspect-ratio row spans

interface PhotoGridProps {
  images: ImageInfo[];
  onPhotoClick: (index: number) => void;
  lightboxOpen?: boolean;
}

export default function PhotoGrid({ images, onPhotoClick, lightboxOpen }: PhotoGridProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cardRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ colWidth: number; gap: number }>({ colWidth: 0, gap: 0 });

  // Keep refs array in sync with images
  if (cardRefs.current.length !== images.length) {
    cardRefs.current = images.map((_, i) => cardRefs.current[i] || createRef<HTMLDivElement>());
  }

  // Measure column width and gap from the live grid so row spans match actual layout
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const cols = style.gridTemplateColumns.split(' ').length;
      const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
      const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setLayout({ colWidth: (w - gap * (cols - 1)) / cols, gap });
    };

    measure(); // Compute before first paint
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getRowSpan = useCallback((image: ImageInfo) => {
    if (layout.colWidth <= 0 || !image.width || !image.height) return undefined;
    const displayHeight = layout.colWidth * (image.height / image.width);
    return Math.max(1, Math.round((displayHeight + layout.gap) / (BASE_ROW + layout.gap)));
  }, [layout]);

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
    <div
      ref={containerRef}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 grid-flow-row-dense gap-3 sm:gap-4 p-3 sm:p-4 safe-left safe-right"
      style={{ gridAutoRows: `${BASE_ROW}px` }}
    >
      {images.map((image, index) => (
        <PhotoCard
          key={image.path}
          ref={cardRefs.current[index]}
          image={image}
          onClick={() => onPhotoClick(index)}
          focused={focusedIndex === index}
          rowSpan={getRowSpan(image)}
        />
      ))}
    </div>
  );
}
