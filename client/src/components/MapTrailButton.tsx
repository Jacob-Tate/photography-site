import { useState, useMemo } from 'react';
import { ImageInfo } from '../api/client';
import MapTrailModal from './MapTrailModal';

interface MapTrailButtonProps {
  images: ImageInfo[];
  currentImage?: ImageInfo;
  compact?: boolean;
}

export default function MapTrailButton({ images, currentImage, compact }: MapTrailButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Filter to only geotagged images and sort by date taken
  const geotaggedImages = useMemo(() => {
    const withGps = images.filter(img => img.exif?.gps);
    // Sort by date taken (chronologically)
    return withGps.sort((a, b) => {
      const dateA = parseDateTaken(a.exif?.dateTaken);
      const dateB = parseDateTaken(b.exif?.dateTaken);
      return dateA - dateB;
    });
  }, [images]);

function parseDateTaken(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr.replace(' at ', ' '));
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

  // Don't show button if fewer than 2 geotagged photos
  if (geotaggedImages.length < 2) {
    return null;
  }

  const icon = (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="p-3 sm:p-2 text-white/70 hover:text-white transition-colors touch-target"
          aria-label="View photo trail on map"
          title={`View trail of ${geotaggedImages.length} photos on map`}
        >
          {icon}
        </button>

        {showModal && (
          <MapTrailModal
            images={geotaggedImages}
            currentImage={currentImage}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-neutral-800 hover:bg-neutral-700 rounded-md text-white transition-colors"
        aria-label="View photo trail on map"
        title={`View trail of ${geotaggedImages.length} photos on map`}
      >
        {icon}
        <span className="hidden sm:inline">Map</span>
      </button>

      {showModal && (
        <MapTrailModal
          images={geotaggedImages}
          currentImage={currentImage}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
