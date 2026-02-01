import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePortfolio } from '../hooks/usePhotos';
import { useLightbox } from '../hooks/useLightbox';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';

export default function PortfolioPage() {
  const [searchParams] = useSearchParams();
  const imageParam = searchParams.get('image');

  const { images, loading, error } = usePortfolio();
  const lightbox = useLightbox(images);

  // Auto-open lightbox when ?image= param is present
  useEffect(() => {
    if (!imageParam || images.length === 0) return;
    const index = images.findIndex(img => img.filename === imageParam);
    if (index !== -1) {
      lightbox.open(index);
    }
  }, [imageParam, images.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400">
        {error}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-neutral-500">
        No photos in portfolio yet
      </div>
    );
  }

  return (
    <>
      <PhotoGrid images={images} onPhotoClick={lightbox.open} lightboxOpen={lightbox.isOpen} />
      {lightbox.isOpen && lightbox.currentImage && (
        <Lightbox
          image={lightbox.currentImage}
          onClose={lightbox.close}
          onNext={lightbox.next}
          onPrev={lightbox.prev}
          hasNext={lightbox.hasNext}
          hasPrev={lightbox.hasPrev}
          images={images}
          currentIndex={lightbox.currentIndex!}
          onNavigate={lightbox.navigateTo}
        />
      )}
    </>
  );
}
