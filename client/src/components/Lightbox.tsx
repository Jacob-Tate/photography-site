import { useEffect, useState, useRef, useCallback } from 'react';
import { ImageInfo } from '../api/client';
import DownloadButton from './DownloadButton';
import ShareButton from './ShareButton';
import Histogram from './Histogram';

const geocodeCache = new Map<string, string>();

function useReverseGeocode(lat: number | undefined, lon: number | undefined): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (lat === undefined || lon === undefined) { setName(null); return; }
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (geocodeCache.has(key)) { setName(geocodeCache.get(key)!); return; }

    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const addr = data.address;
        if (!addr) return;
        const city = addr.city || addr.town || addr.village || addr.hamlet || addr.county || '';
        const country = addr.country || '';
        const label = [city, country].filter(Boolean).join(', ');
        if (label) {
          geocodeCache.set(key, label);
          setName(label);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lon]);

  return name;
}

interface LightboxProps {
  image: ImageInfo;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  images?: ImageInfo[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export default function Lightbox({
  image,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  images,
  currentIndex,
  onNavigate,
}: LightboxProps) {
  const locationName = useReverseGeocode(image.exif?.gps?.latitude, image.exif?.gps?.longitude);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch gesture state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchDistanceRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showFullExif, setShowFullExif] = useState(false);

  const filmstripRef = useRef<HTMLDivElement>(null);
  const filmstripDrag = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const hasScrolledRef = useRef(false);

  const isLoaded = loadedUrl === image.fullUrl;
  const isZoomed = zoom > 1;
  const showFilmstrip = images && currentIndex !== undefined && onNavigate && images.length > 1;

  // Reset zoom, position, and exif panel when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setShowFullExif(false);
  }, [image.fullUrl]);

  // Scroll filmstrip to center a given index
  const scrollFilmstrip = useCallback((index: number, smooth: boolean) => {
    const el = filmstripRef.current;
    if (!el || !images) return;

    const thumbHeight = 56; // h-14
    const gap = 4; // gap-1

    // The filmstrip has paddingLeft: calc(50vw - 28px) to allow centering the first thumbnail
    const padLeft = window.innerWidth / 2 - 28;

    // Calculate position from image dimensions (works before thumbnails load)
    let pos = padLeft;
    for (let i = 0; i < index; i++) {
      const img = images[i];
      pos += (img.width && img.height ? thumbHeight * (img.width / img.height) : thumbHeight) + gap;
    }
    const targetImg = images[index];
    const targetWidth = targetImg.width && targetImg.height ? thumbHeight * (targetImg.width / targetImg.height) : thumbHeight;

    // Center target in viewport
    const target = Math.max(0, pos + targetWidth / 2 - el.clientWidth / 2);
    if (smooth) {
      el.scrollTo({ left: target, behavior: 'smooth' });
    } else {
      el.scrollLeft = target;
    }
  }, [images]);

  // Auto-scroll filmstrip to active thumbnail
  useEffect(() => {
    if (!showFilmstrip || currentIndex === undefined) return;

    if (!hasScrolledRef.current) {
      // First open: use instant scroll after a frame so the filmstrip is in the DOM
      hasScrolledRef.current = true;
      requestAnimationFrame(() => scrollFilmstrip(currentIndex, false));
    } else {
      scrollFilmstrip(currentIndex, true);
    }
  }, [currentIndex, showFilmstrip, scrollFilmstrip]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Preload adjacent images
  useEffect(() => {
    const preload = new Image();
    preload.src = image.fullUrl;
  }, [image.fullUrl]);

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => {
      const newZoom = Math.max(1, Math.min(10, prev + delta));
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    handleZoom(delta);
  }, [handleZoom]);

  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  }, [zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = position;
  }, [isZoomed, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: positionStart.current.x + dx,
      y: positionStart.current.y + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      if (isZoomed) {
        setIsDragging(true);
        dragStart.current = { x: touch.clientX, y: touch.clientY };
        positionStart.current = position;
      }
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [isZoomed, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isZoomed && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      setPosition({
        x: positionStart.current.x + dx,
        y: positionStart.current.y + dy,
      });
    } else if (e.touches.length === 2 && lastTouchDistanceRef.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const delta = (distance - lastTouchDistanceRef.current) * 0.02;
      handleZoom(delta);
      lastTouchDistanceRef.current = distance;
    }
  }, [isZoomed, isDragging, handleZoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0 && touchStartRef.current) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      const isTap = dt < 200 && Math.abs(dx) < 10 && Math.abs(dy) < 10;

      // Swipe detection (min 50px, max 300ms) - only when not zoomed
      if (!isZoomed && dt < 300 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && hasPrev) {
          onPrev();
        } else if (dx < 0 && hasNext) {
          onNext();
        }
      } else if (isTap) {
        // Tap to toggle controls (works when zoomed too)
        setShowControls(prev => !prev);
      }
    }
    setIsDragging(false);
    touchStartRef.current = null;
    lastTouchDistanceRef.current = null;
  }, [isZoomed, hasPrev, hasNext, onPrev, onNext]);

  // Handle keyboard for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        handleZoom(0.5);
      } else if (e.key === '-') {
        handleZoom(-0.5);
      } else if (e.key === '0') {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoom]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar - hidden on mobile when tapped */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 safe-top bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Zoom controls - hidden on small screens */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.5)}
            className="p-2 text-white/70 hover:text-white transition-colors"
            title="Zoom out (-)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-white/70 text-sm min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.5)}
            className="p-2 text-white/70 hover:text-white transition-colors"
            title="Zoom in (+)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {isZoomed && (
            <button
              onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
              className="ml-2 px-2 py-1 text-xs text-white/70 hover:text-white border border-white/30 rounded transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Mobile: Empty space for balance */}
        <div className="sm:hidden" />

        {/* Right controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <ShareButton type="image" targetPath={image.path} compact />
          <DownloadButton url={image.downloadUrl} filename={image.filename} />
          <button
            onClick={onClose}
            className="p-3 sm:p-2 text-white/70 hover:text-white transition-colors touch-target"
            aria-label="Close"
          >
            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Previous button - hidden on touch devices */}
      {hasPrev && !isZoomed && (
        <button
          onClick={onPrev}
          className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Previous"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button - hidden on touch devices */}
      {hasNext && !isZoomed && (
        <button
          onClick={onNext}
          className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Next"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className={`max-w-[90vw] ${showFilmstrip && !isZoomed ? 'max-h-[calc(90vh-80px)]' : 'max-h-[90vh]'} relative ${isZoomed ? 'cursor-grab' : 'cursor-zoom-in'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
      >
        {/* Loading spinner - show when current image not loaded */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center min-w-[200px] min-h-[200px]">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Image with key to force remount on URL change */}
        <img
          key={image.fullUrl}
          src={image.fullUrl}
          alt={image.filename}
          className={`max-w-[90vw] ${showFilmstrip && !isZoomed ? 'max-h-[calc(90vh-80px)]' : 'max-h-[90vh]'} object-contain select-none transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
          onLoad={() => setLoadedUrl(image.fullUrl)}
          draggable={false}
        />
      </div>

      {/* Click outside to close (only when not zoomed) */}
      {!isZoomed && (
        <div className="absolute inset-0 -z-10" onClick={onClose} />
      )}

      {/* Zoom/swipe hint */}
      {isLoaded && !isZoomed && showControls && !image.exif && (
        <div className="absolute bottom-4 safe-bottom left-1/2 -translate-x-1/2 text-white/40 text-sm pointer-events-none text-center px-4">
          <span className="hidden sm:inline">Scroll or double-click to zoom</span>
          <span className="sm:hidden">Swipe to navigate • Pinch to zoom</span>
        </div>
      )}

      {/* Caption panel */}
      {isLoaded && showControls && !isZoomed && image.caption && (
        <div
          className={`absolute left-4 z-20 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white/90 max-w-[340px] max-h-[200px] overflow-y-auto prose prose-invert prose-sm ${showFilmstrip ? 'bottom-[88px]' : 'bottom-4 safe-bottom'}`}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          dangerouslySetInnerHTML={{ __html: image.caption }}
        />
      )}

      {/* EXIF data panel */}
      {isLoaded && showControls && image.exif && (
        <div
          className={`absolute right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/90 max-w-[340px] cursor-pointer select-none ${showFilmstrip && !isZoomed ? 'bottom-[88px]' : 'bottom-4 safe-bottom'}`}
          onClick={(e) => { e.stopPropagation(); setShowFullExif(!showFullExif); }}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {/* Primary exposure settings */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
            {image.exif.focalLength && (
              <span className="whitespace-nowrap font-medium">{image.exif.focalLength}</span>
            )}
            {image.exif.aperture && (
              <span className="whitespace-nowrap font-medium">{image.exif.aperture}</span>
            )}
            {image.exif.shutterSpeed && (
              <span className="whitespace-nowrap font-medium">{image.exif.shutterSpeed}</span>
            )}
            {image.exif.iso && (
              <span className="whitespace-nowrap font-medium">ISO {image.exif.iso}</span>
            )}
            {image.exif.exposureComp && image.exif.exposureComp !== '±0 EV' && (
              <span className="whitespace-nowrap text-white/70">{image.exif.exposureComp}</span>
            )}
          </div>

          {/* Camera and lens */}
          {(image.exif.camera || image.exif.lens) && (
            <div className="mt-1 text-white/60 truncate">
              {image.exif.camera}
              {image.exif.camera && image.exif.lens && ' · '}
              {image.exif.lens}
            </div>
          )}

          {/* Expanded details */}
          {showFullExif && (
            <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
              {/* Luminosity histogram */}
              <div className="pb-1 mb-1 border-b border-white/10">
                <Histogram imageUrl={image.fullUrl} />
              </div>
              {/* Dimensions row */}
              {image.exif.dimensions && (
                <div className="flex justify-between text-white/70">
                  <span>Dimensions</span>
                  <span className="text-white/90">
                    {image.exif.dimensions}
                    {image.exif.aspectRatio && ` (${image.exif.aspectRatio})`}
                  </span>
                </div>
              )}
              {image.exif.megapixels && (
                <div className="flex justify-between text-white/70">
                  <span>Resolution</span>
                  <span className="text-white/90">{image.exif.megapixels}</span>
                </div>
              )}
              {image.width > 0 && image.height > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Max Print Size</span>
                  <span className="text-white/90">
                    {(image.width / 300).toFixed(1)} × {(image.height / 300).toFixed(1)} in
                  </span>
                </div>
              )}
              {image.exif.colorSpace && (
                <div className="flex justify-between text-white/70">
                  <span>Color Space</span>
                  <span className="text-white/90">{image.exif.colorSpace}</span>
                </div>
              )}
              {image.exif.whiteBalance && (
                <div className="flex justify-between text-white/70">
                  <span>White Balance</span>
                  <span className="text-white/90">{image.exif.whiteBalance}</span>
                </div>
              )}
              {image.exif.flash && (
                <div className="flex justify-between text-white/70">
                  <span>Flash</span>
                  <span className="text-white/90">{image.exif.flash}</span>
                </div>
              )}
              {image.exif.dateTaken && (
                <div className="flex justify-between text-white/70">
                  <span>Date</span>
                  <span className="text-white/90">{image.exif.dateTaken}</span>
                </div>
              )}
              {image.exif.gps && (
                <div className="flex justify-between text-white/70 items-center">
                  <span>Location</span>
                  <a
                    href={`https://www.google.com/maps?q=${image.exif.gps.latitude},${image.exif.gps.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {locationName ? (
                      <>{locationName}<br /><span className="text-white/40 text-xs no-underline">{image.exif.gps.latitude.toFixed(4)}, {image.exif.gps.longitude.toFixed(4)}</span></>
                    ) : (
                      <>{image.exif.gps.latitude.toFixed(4)}, {image.exif.gps.longitude.toFixed(4)}</>
                    )}
                    {image.exif.gps.altitude !== undefined && <span className="text-white/40 text-xs"> ({image.exif.gps.altitude}m)</span>}
                  </a>
                </div>
              )}
              {image.exif.keywords && image.exif.keywords.length > 0 && (
                <div className="text-white/70 pt-1">
                  <span className="block mb-1">Keywords</span>
                  <div className="flex flex-wrap gap-1">
                    {image.exif.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="bg-white/10 text-white/90 px-2 py-0.5 rounded text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expand hint */}
          {!showFullExif && (image.exif.dimensions || image.exif.dateTaken) && (
            <div className="mt-1 text-white/40 text-center">tap for more</div>
          )}
        </div>
      )}

      {/* Filmstrip */}
      {showFilmstrip && showControls && !isZoomed && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 bg-black/70 backdrop-blur-sm safe-bottom"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div
            ref={filmstripRef}
            className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingLeft: 'calc(50vw - 28px)', paddingRight: 'calc(50vw - 28px)' }}
            onMouseDown={(e) => {
              const el = filmstripRef.current;
              if (!el) return;
              filmstripDrag.current = { isDown: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft, moved: false };
            }}
            onMouseMove={(e) => {
              const d = filmstripDrag.current;
              const el = filmstripRef.current;
              if (!d.isDown || !el) return;
              const x = e.pageX - el.offsetLeft;
              const walk = x - d.startX;
              if (Math.abs(walk) > 5) d.moved = true;
              el.scrollLeft = d.scrollLeft - walk;
            }}
            onMouseUp={() => { filmstripDrag.current.isDown = false; }}
            onMouseLeave={() => { filmstripDrag.current.isDown = false; }}
          >
            {images!.map((img, idx) => (
              <button
                key={img.path || idx}
                data-active={idx === currentIndex}
                onClick={(e) => { if (filmstripDrag.current.moved) { e.preventDefault(); return; } onNavigate!(idx); }}
                className={`flex-shrink-0 h-14 rounded overflow-hidden transition-all ${
                  idx === currentIndex
                    ? 'ring-2 ring-white opacity-100'
                    : 'opacity-50 hover:opacity-80'
                }`}
                style={{
                  aspectRatio: img.width && img.height ? `${img.width}/${img.height}` : '1/1',
                }}
              >
                <img
                  src={img.thumbnailUrl}
                  alt={img.filename}
                  className="h-full w-auto object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
