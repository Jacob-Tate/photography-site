import { useEffect, useState, useRef, useCallback } from 'react';
import { ImageInfo } from '../api/client';
import DownloadButton from './DownloadButton';

interface LightboxProps {
  image: ImageInfo;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function Lightbox({
  image,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: LightboxProps) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoaded = loadedUrl === image.fullUrl;
  const isZoomed = zoom > 1;

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [image.fullUrl]);

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

  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    setZoom(prev => {
      const newZoom = Math.max(1, Math.min(5, prev + delta));
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
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
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

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <DownloadButton url={image.downloadUrl} filename={image.filename} />
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Previous button */}
      {hasPrev && !isZoomed && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Previous"
        >
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasNext && !isZoomed && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white transition-colors"
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
        className={`max-w-[90vw] max-h-[90vh] relative ${isZoomed ? 'cursor-grab' : 'cursor-zoom-in'} ${isDragging ? 'cursor-grabbing' : ''}`}
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
          className={`max-w-[90vw] max-h-[90vh] object-contain select-none transition-opacity duration-200 ${
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

      {/* Zoom hint */}
      {isLoaded && !isZoomed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm pointer-events-none">
          Scroll or double-click to zoom
        </div>
      )}
    </div>
  );
}
