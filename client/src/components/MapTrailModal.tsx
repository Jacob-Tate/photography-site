import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ImageInfo } from '../api/client';
import Lightbox from './Lightbox';
import { groupImagesByDay } from '../utils/tripDays';

// Colors for different days (cycle through these)
const DAY_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

// Fix default marker icons for Leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapTrailModalProps {
  images: ImageInfo[];
  currentImage?: ImageInfo;
  onClose: () => void;
}

// Custom marker icon for the current image
const currentIcon = L.divIcon({
  className: 'current-marker',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Custom marker icon for start point
const startIcon = L.divIcon({
  className: 'start-marker',
  html: `<div style="
    width: 16px;
    height: 16px;
    background: #22c55e;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Custom marker icon for end point
const endIcon = L.divIcon({
  className: 'end-marker',
  html: `<div style="
    width: 16px;
    height: 16px;
    background: #ef4444;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Custom marker for intermediate points
const pointIcon = L.divIcon({
  className: 'point-marker',
  html: `<div style="
    width: 10px;
    height: 10px;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  "></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

// Fit map to bounds of all points
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;

    const bounds = L.latLngBounds(positions);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, positions]);

  return null;
}

// Format date string for display (handles " at " format)
function formatDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr.replace(' at ', ' '));
  return isNaN(parsed.getTime()) ? null : parsed.toLocaleString();
}

// Calculate trail statistics
function calculateStats(images: ImageInfo[]) {
  if (images.length < 2) return null;

  let totalDistance = 0;
  for (let i = 1; i < images.length; i++) {
    const prev = images[i - 1].exif!.gps!;
    const curr = images[i].exif!.gps!;
    totalDistance += haversineDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude
    );
  }

  const startDate = images[0].exif?.dateTaken;
  const endDate = images[images.length - 1].exif?.dateTaken;
  let duration: string | null = null;

  if (startDate && endDate) {
    const start = new Date(startDate.replace(' at ', ' '));
    const end = new Date(endDate.replace(' at ', ' '));
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      duration = `${Math.round(diffMs / (1000 * 60))} min`;
    } else if (diffHours < 24) {
      duration = `${diffHours.toFixed(1)} hrs`;
    } else {
      const days = Math.floor(diffHours / 24);
      duration = `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  return {
    distance: totalDistance < 1
      ? `${(totalDistance * 1000).toFixed(0)} m`
      : `${totalDistance.toFixed(1)} km`,
    photos: images.length,
    duration,
  };
}

// Haversine formula to calculate distance between two points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapTrailModal({ images, currentImage, onClose }: MapTrailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showAllMarkers, setShowAllMarkers] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showDaySeparation, setShowDaySeparation] = useState(false);
  const [visibleDays, setVisibleDays] = useState<Set<string>>(new Set());

  // Group images by day
  const dayGroups = useMemo(() => groupImagesByDay(images), [images]);
  const hasMultipleDays = dayGroups.length > 1 && dayGroups[0].dateKey !== 'unknown';

  // Initialize visible days when day groups change
  useEffect(() => {
    setVisibleDays(new Set(dayGroups.map(g => g.dateKey)));
  }, [dayGroups]);

  // Get visible images based on day filter
  const visibleImages = useMemo(() => {
    if (!showDaySeparation) return images;
    return images.filter(img => {
      const dateKey = img.exif?.dateTaken
        ? new Date(img.exif.dateTaken.replace(' at ', ' ')).toISOString().split('T')[0]
        : 'unknown';
      return visibleDays.has(dateKey);
    });
  }, [images, showDaySeparation, visibleDays]);

  // Generate positions array for the polyline (all visible images)
  const positions: [number, number][] = visibleImages
    .filter(img => img.exif?.gps)
    .map(img => [img.exif!.gps!.latitude, img.exif!.gps!.longitude]);

  const stats = calculateStats(visibleImages);

  const toggleDay = (dateKey: string) => {
    setVisibleDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const toggleAllDays = () => {
    if (visibleDays.size === dayGroups.length) {
      setVisibleDays(new Set());
    } else {
      setVisibleDays(new Set(dayGroups.map(g => g.dateKey)));
    }
  };

  // Close on escape key (only if lightbox is not open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxIndex === null) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, lightboxIndex]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (positions.length === 0) return null;

  const defaultCenter: [number, number] = positions[0];

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
      style={{ zIndex: 2000 }}
      onClick={handleBackdropClick}
    >
      <div className="bg-neutral-900 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-white text-lg font-medium">Photo Trail</h2>
            {stats && (
              <div className="flex items-center gap-3 text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {stats.distance}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {stats.photos} photos
                </span>
                {stats.duration && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {stats.duration}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllMarkers}
                onChange={(e) => setShowAllMarkers(e.target.checked)}
                className="rounded border-white/30"
              />
              Show all points
            </label>
            {hasMultipleDays && (
              <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDaySeparation}
                  onChange={(e) => setShowDaySeparation(e.target.checked)}
                  className="rounded border-white/30"
                />
                Separate days
              </label>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Day Filter Panel (when day separation is enabled) */}
        {showDaySeparation && hasMultipleDays && (
          <div className="px-4 py-2 border-b border-white/10 flex flex-wrap items-center gap-2">
            <button
              onClick={toggleAllDays}
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              {visibleDays.size === dayGroups.length ? 'Hide all' : 'Show all'}
            </button>
            <span className="text-white/30">|</span>
            {dayGroups.map((group, idx) => (
              <label
                key={group.dateKey}
                className="flex items-center gap-1.5 text-xs cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={visibleDays.has(group.dateKey)}
                  onChange={() => toggleDay(group.dateKey)}
                  className="rounded border-white/30"
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] }}
                />
                <span className="text-white/70 group-hover:text-white transition-colors">
                  Day {group.dayNumber}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={10}
            className="h-full w-full"
            style={{ background: '#1a1a1a' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Trail polylines - either single or per-day */}
            {showDaySeparation && hasMultipleDays ? (
              // Render separate polyline for each visible day
              dayGroups.map((group, idx) => {
                if (!visibleDays.has(group.dateKey)) return null;
                const dayPositions: [number, number][] = group.images
                  .filter(img => img.exif?.gps)
                  .map(img => [img.exif!.gps!.latitude, img.exif!.gps!.longitude]);
                if (dayPositions.length < 2) return null;
                return (
                  <Polyline
                    key={group.dateKey}
                    positions={dayPositions}
                    pathOptions={{
                      color: DAY_COLORS[idx % DAY_COLORS.length],
                      weight: 3,
                      opacity: 0.8,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />
                );
              })
            ) : (
              // Single polyline for all images
              <Polyline
                positions={positions}
                pathOptions={{
                  color: '#3b82f6',
                  weight: 3,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {/* Start marker */}
            {visibleImages.length > 0 && visibleImages[0].exif?.gps && (() => {
              const startImage = visibleImages[0];
              const startIdx = images.findIndex(img => img.path === startImage.path);
              return (
                <Marker position={[startImage.exif!.gps!.latitude, startImage.exif!.gps!.longitude]} icon={startIcon}>
                  <Popup className="photo-popup">
                    <div className="marker-popup">
                      <img
                        src={startImage.thumbnailUrl}
                        alt={startImage.filename}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => startIdx !== -1 && setLightboxIndex(startIdx)}
                      />
                      <div className="popup-info">
                        <strong>Start</strong>
                        <span>{formatDate(startImage.exif?.dateTaken) || startImage.filename}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })()}

            {/* End marker */}
            {visibleImages.length > 1 && (() => {
              const lastImage = visibleImages[visibleImages.length - 1];
              if (!lastImage.exif?.gps) return null;
              const lastIdx = images.findIndex(img => img.path === lastImage.path);
              return (
                <Marker position={[lastImage.exif.gps.latitude, lastImage.exif.gps.longitude]} icon={endIcon}>
                  <Popup className="photo-popup">
                    <div className="marker-popup">
                      <img
                        src={lastImage.thumbnailUrl}
                        alt={lastImage.filename}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => lastIdx !== -1 && setLightboxIndex(lastIdx)}
                      />
                      <div className="popup-info">
                        <strong>End</strong>
                        <span>{formatDate(lastImage.exif?.dateTaken) || lastImage.filename}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })()}

            {/* Current image marker (if viewing from lightbox) */}
            {currentImage?.exif?.gps && (() => {
              const currentIdx = images.findIndex(img => img.path === currentImage.path);
              return (
                <Marker
                  position={[currentImage.exif.gps.latitude, currentImage.exif.gps.longitude]}
                  icon={currentIcon}
                >
                  <Popup className="photo-popup">
                    <div className="marker-popup">
                      <img
                        src={currentImage.thumbnailUrl}
                        alt={currentImage.filename}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => currentIdx !== -1 && setLightboxIndex(currentIdx)}
                      />
                      <div className="popup-info">
                        <strong>Current photo</strong>
                        <span>{formatDate(currentImage.exif?.dateTaken) || currentImage.filename}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })()}

            {/* Intermediate points (optional) */}
            {showAllMarkers && visibleImages.slice(1, -1).map((img, idx) => {
              if (!img.exif?.gps) return null;
              // Skip if this is the current image (already shown)
              if (currentImage && img.path === currentImage.path) return null;
              // Find the index in the original images array for lightbox
              const imageIndex = images.findIndex(i => i.path === img.path);
              return (
                <Marker
                  key={img.path}
                  position={[img.exif.gps.latitude, img.exif.gps.longitude]}
                  icon={pointIcon}
                >
                  <Popup className="photo-popup">
                    <div className="marker-popup">
                      <img
                        src={img.thumbnailUrl}
                        alt={img.filename}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => imageIndex !== -1 && setLightboxIndex(imageIndex)}
                      />
                      <div className="popup-info">
                        <span>#{idx + 2}</span>
                        <span>{formatDate(img.exif?.dateTaken) || img.filename}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            <FitBounds positions={positions} />
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/80 z-[1000]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded-full border border-white"></span>
                Start
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded-full border border-white"></span>
                End
              </span>
              {currentImage?.exif?.gps && (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></span>
                  Current
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for viewing photos */}
      {lightboxIndex !== null && (
        <div style={{ zIndex: 3000 }}>
          <Lightbox
            image={images[lightboxIndex]}
            onClose={() => setLightboxIndex(null)}
            onNext={() => {
              if (lightboxIndex < images.length - 1) {
                setLightboxIndex(lightboxIndex + 1);
              }
            }}
            onPrev={() => {
              if (lightboxIndex > 0) {
                setLightboxIndex(lightboxIndex - 1);
              }
            }}
            hasNext={lightboxIndex < images.length - 1}
            hasPrev={lightboxIndex > 0}
            images={images}
            currentIndex={lightboxIndex}
            onNavigate={setLightboxIndex}
            hideMapButton
          />
        </div>
      )}
    </div>
  );
}
