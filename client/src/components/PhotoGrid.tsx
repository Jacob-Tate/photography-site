import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo, createRef } from 'react';
import { ImageInfo } from '../api/client';
import PhotoCard from './PhotoCard';

const BASE_ROW = 4; // Small base unit (px) for fine-grained aspect-ratio row spans

interface PhotoGridProps {
  images: ImageInfo[];
  onPhotoClick: (index: number) => void;
  lightboxOpen?: boolean;
}

interface Placement {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  center: boolean;
}

function computePlacements(
  images: ImageInfo[],
  cols: number,
  colWidth: number,
  gap: number,
): Placement[] {
  const unit = BASE_ROW + gap;

  // Compute natural spans for each image
  const spans = images.map(img => {
    if (!img.width || !img.height) {
      return { rowSpan: Math.round((colWidth + gap) / unit), colSpan: 1 };
    }
    const ratio = img.width / img.height;
    const colSpan = ratio > 2.5 ? Math.min(2, cols) : 1;
    const displayWidth = colSpan * colWidth + (colSpan - 1) * gap;
    const displayHeight = displayWidth * (img.height / img.width);
    const rowSpan = Math.max(1, Math.round((displayHeight + gap) / unit));
    return { rowSpan, colSpan };
  });

  // Place items greedily (left-to-right, top-to-bottom)
  const colEnds = new Array(cols).fill(0);
  const colLastSingle = new Array(cols).fill(-1); // last single-col item index per column
  const placements: Placement[] = [];

  for (let i = 0; i < images.length; i++) {
    const { rowSpan, colSpan } = spans[i];

    // Find the position with the lowest starting row, preferring leftmost
    let bestCol = 0;
    let bestRow = Infinity;
    for (let c = 0; c <= cols - colSpan; c++) {
      let startRow = 0;
      for (let dc = 0; dc < colSpan; dc++) {
        startRow = Math.max(startRow, colEnds[c + dc]);
      }
      if (startRow < bestRow) {
        bestRow = startRow;
        bestCol = c;
      }
    }

    // For multi-col items, extend single-col items above to fill any gap
    if (colSpan > 1) {
      for (let dc = 0; dc < colSpan; dc++) {
        const c = bestCol + dc;
        const lastIdx = colLastSingle[c];
        if (lastIdx < 0) continue;
        const above = placements[lastIdx];
        const aboveEnd = above.row + above.rowSpan;

        // Find the nearest item in this column after the above item —
        // we can only extend up to that point, not past it
        let maxExtend = bestRow;
        for (let j = 0; j < placements.length; j++) {
          if (j === lastIdx) continue;
          const other = placements[j];
          if (other.col > c || other.col + other.colSpan <= c) continue;
          if (other.row >= aboveEnd && other.row < maxExtend) {
            maxExtend = other.row;
          }
        }

        const gapRows = maxExtend - aboveEnd;
        if (gapRows > 0) {
          above.rowSpan += gapRows;
          above.center = true;
        }
      }
    }

    placements.push({ row: bestRow, col: bestCol, rowSpan, colSpan, center: false });

    // Update column tracking
    for (let dc = 0; dc < colSpan; dc++) {
      colEnds[bestCol + dc] = bestRow + rowSpan;
      if (colSpan === 1) {
        colLastSingle[bestCol + dc] = i;
      }
    }
  }

  return placements;
}

export default function PhotoGrid({ images, onPhotoClick, lightboxOpen }: PhotoGridProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const cardRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ colWidth: number; gap: number; cols: number }>({ colWidth: 0, gap: 0, cols: 2 });

  // Keep refs array in sync with images
  if (cardRefs.current.length !== images.length) {
    cardRefs.current = images.map((_, i) => cardRefs.current[i] || createRef<HTMLDivElement>());
  }

  // Measure column width and gap from the live grid
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const cols = style.gridTemplateColumns.split(' ').length;
      const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
      const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setLayout({ colWidth: (w - gap * (cols - 1)) / cols, gap, cols });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const placements = useMemo(() => {
    if (layout.colWidth <= 0) return null;
    return computePlacements(images, layout.cols, layout.colWidth, layout.gap);
  }, [images, layout]);

  const scrollToIndex = useCallback((index: number) => {
    const el = cardRefs.current[index]?.current;
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  useEffect(() => {
    if (lightboxOpen) {
      setFocusedIndex(null);
    }
  }, [lightboxOpen]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 safe-left safe-right"
      style={{ gridAutoRows: `${BASE_ROW}px` }}
    >
      {images.map((image, index) => {
        const p = placements?.[index];
        return (
          <PhotoCard
            key={image.path}
            ref={cardRefs.current[index]}
            image={image}
            onClick={() => onPhotoClick(index)}
            focused={focusedIndex === index}
            gridStyle={p ? {
              gridRow: `${p.row + 1} / span ${p.rowSpan}`,
              gridColumn: `${p.col + 1} / span ${p.colSpan}`,
            } : undefined}
            center={p?.center}
          />
        );
      })}
    </div>
  );
}
