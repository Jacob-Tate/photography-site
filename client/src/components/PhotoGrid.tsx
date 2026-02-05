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

  // 1. Pre-calculate spans for all images
  const spans = images.map(img => {
    if (!img.width || !img.height) {
      return { rowSpan: Math.round((colWidth + gap) / unit), colSpan: 1 };
    }
    const ratio = img.width / img.height;
    // Cap colSpan at cols (e.g. mobile 2 cols, wide image wants 2 cols)
    const colSpan = ratio > 2.5 ? Math.min(2, cols) : 1;
    const displayWidth = colSpan * colWidth + (colSpan - 1) * gap;
    const displayHeight = displayWidth * (img.height / img.width);
    const rowSpan = Math.max(1, Math.round((displayHeight + gap) / unit));
    return { rowSpan, colSpan };
  });

  const colEnds = new Array(cols).fill(0);
  const colLastSingle = new Array(cols).fill(-1); // last single-col item index per column
  const placements: (Placement | null)[] = new Array(images.length).fill(null);
  
  // Pool of available image indices
  const pool = Array.from({ length: images.length }, (_, i) => i);

  // Helper to find the best position for a given span
  const findBestPosition = (span: { rowSpan: number, colSpan: number }) => {
    let bestCol = 0;
    let bestRow = Infinity;
    
    // Search for lowest starting row
    for (let c = 0; c <= cols - span.colSpan; c++) {
      let startRow = 0;
      for (let dc = 0; dc < span.colSpan; dc++) {
        startRow = Math.max(startRow, colEnds[c + dc]);
      }
      if (startRow < bestRow) {
        bestRow = startRow;
        bestCol = c;
      }
    }

    // Calculate wasted space (gap created below the item placement)
    let wasted = 0;
    for (let dc = 0; dc < span.colSpan; dc++) {
      wasted += (bestRow - colEnds[bestCol + dc]);
    }
    
    return { row: bestRow, col: bestCol, wasted };
  };

  while (pool.length > 0) {
    // 1. Try the next item in strictly sorted order
    const headIdx = 0;
    const originalIdx = pool[headIdx];
    const span = spans[originalIdx];
    const headPos = findBestPosition(span);

    let chosenIndexInPool = headIdx;
    let chosenPos = headPos;

    // 2. If the greedy choice creates a gap, look ahead for a better fit
    if (headPos.wasted > 0) {
      const LOOKAHEAD = 10;
      let minWasted = headPos.wasted;

      for (let i = 1; i < Math.min(pool.length, LOOKAHEAD); i++) {
        const candidateIdx = pool[i];
        const candidateSpan = spans[candidateIdx];
        const candidatePos = findBestPosition(candidateSpan);

        // If we find an item that fits better (less wasted space), pick it
        if (candidatePos.wasted < minWasted) {
          minWasted = candidatePos.wasted;
          chosenIndexInPool = i;
          chosenPos = candidatePos;
          if (minWasted === 0) break; // Perfect fit found
        }
      }
    }

    // 3. Place the chosen item
    const finalIdx = pool[chosenIndexInPool];
    const finalSpan = spans[finalIdx];
    
    // Remove from pool
    pool.splice(chosenIndexInPool, 1);

    // 4. For multi-column items, stretch single items above to fill gaps
    if (finalSpan.colSpan > 1) {
      const { row, col } = chosenPos;
      
      for (let dc = 0; dc < finalSpan.colSpan; dc++) {
        const c = col + dc;
        const lastIdx = colLastSingle[c];
        
        if (lastIdx !== -1) {
          const above = placements[lastIdx];
          if (above) {
            const aboveEnd = above.row + above.rowSpan;
            const gapRows = row - aboveEnd;
            
            // If there is empty space between the item above and this new item, stretch the one above
            if (gapRows > 0) {
              above.rowSpan += gapRows;
              above.center = true;
            }
          }
        }
      }
    }

    // Record placement
    placements[finalIdx] = {
      row: chosenPos.row,
      col: chosenPos.col,
      rowSpan: finalSpan.rowSpan,
      colSpan: finalSpan.colSpan,
      center: false,
    };

    // Update column heights
    for (let dc = 0; dc < finalSpan.colSpan; dc++) {
      const c = chosenPos.col + dc;
      colEnds[c] = chosenPos.row + finalSpan.rowSpan;
      if (finalSpan.colSpan === 1) {
        colLastSingle[c] = finalIdx;
      } else {
        // Multi-col items break the chain for stretching
        colLastSingle[c] = -1;
      }
    }
  }

  return placements as Placement[];
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
