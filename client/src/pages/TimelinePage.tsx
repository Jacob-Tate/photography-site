import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchTimeline, ImageInfo } from '../api/client';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';

function parseDate(dateStr?: string): Date {
  if (!dateStr) return new Date(0); // Undated
  return new Date(dateStr.replace(' at ', ' '));
}

function getMonthYear(dateStr?: string): string {
  const date = parseDate(dateStr);
  if (date.getTime() === 0) return 'Undated';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function TimelinePage() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  
  const [searchParams] = useSearchParams();
  const imageParam = searchParams.get('image');
  
  // Ref for infinite scroll trigger
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false); // Sync ref to prevent double-firing

  // Fetch data
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const data = await fetchTimeline(page);
      setImages(prev => [...prev, ...data.images]);
      setHasMore(data.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
      setInitialLoaded(true);
    }
  }, [page, hasMore]);

  // Initial load
  useEffect(() => {
    loadMore();
  }, []); // Run once on mount

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.5, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Lightbox logic
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Auto-open lightbox if ?image= param exists
  useEffect(() => {
    if (!imageParam || images.length === 0) return;
    const index = images.findIndex(img => img.filename === imageParam);
    if (index !== -1 && lightboxIndex === null) {
      setLightboxIndex(index);
    }
  }, [imageParam, images.length]);

  // Group images by month
  const groupedImages = useMemo(() => {
    const groups: { title: string; images: ImageInfo[]; startIndex: number }[] = [];
    
    let currentGroup: { title: string; images: ImageInfo[]; startIndex: number } | null = null;

    images.forEach((img, index) => {
      const monthYear = getMonthYear(img.exif?.dateTaken);
      
      if (!currentGroup || currentGroup.title !== monthYear) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = { title: monthYear, images: [], startIndex: index };
      }
      
      currentGroup.images.push(img);
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [images]);

  if (!initialLoaded && loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      <div className="px-5 py-3 sm:p-4 safe-left safe-right">
        {groupedImages.map(group => (
          <div key={`${group.title}-${group.startIndex}`} className="mb-8">
            <div className="sticky top-[3.5rem] sm:top-[4rem] z-10 bg-neutral-950/90 backdrop-blur-sm py-2 mb-2 border-b border-neutral-800/50">
              <h2 className="text-white font-medium text-lg">{group.title}</h2>
            </div>
            <PhotoGrid 
              images={group.images} 
              onPhotoClick={(idx) => setLightboxIndex(group.startIndex + idx)} 
              lightboxOpen={lightboxIndex !== null}
            />
          </div>
        ))}
        
        {/* Loading trigger / Spinner */}
        <div ref={observerTarget} className="py-8 flex justify-center">
          {loading && hasMore && (
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {!hasMore && images.length > 0 && (
            <div className="text-neutral-600 text-sm">End of timeline</div>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          image={images[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onNext={() => {
            if (lightboxIndex < images.length - 1) setLightboxIndex(lightboxIndex + 1);
          }}
          onPrev={() => {
            if (lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
          }}
          hasNext={lightboxIndex < images.length - 1}
          hasPrev={lightboxIndex > 0}
          images={images}
          currentIndex={lightboxIndex}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}