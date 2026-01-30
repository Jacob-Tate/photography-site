import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { fetchMapImages, MapImage } from '../api/client';
import Lightbox from '../components/Lightbox';

// Fix default marker icons for Leaflet
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom hook to add marker cluster layer
function MarkerClusterGroup({ images, onMarkerClick }: {
  images: MapImage[];
  onMarkerClick: (images: MapImage[]) => void;
}) {
  const map = useMap();
  const markerImageMap = useRef(new WeakMap<L.Marker, MapImage[]>());
  const longPressTriggered = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const activeClusterBounds = useRef<L.LatLngBounds | null>(null);
  const holdingEl = useRef<HTMLElement | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (holdingEl.current) {
      holdingEl.current.classList.remove('holding');
      holdingEl.current = null;
    }
    pointerStart.current = null;
    activeClusterBounds.current = null;
  }, []);

  useEffect(() => {
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="cluster-icon">${count}</div>`,
          className: 'custom-cluster',
          iconSize: L.point(40, 40),
        });
      },
    });

    // Group images by exact location
    const locationMap = new Map<string, MapImage[]>();
    images.forEach(img => {
      if (img.exif?.gps) {
        const key = `${img.exif.gps.latitude.toFixed(6)},${img.exif.gps.longitude.toFixed(6)}`;
        if (!locationMap.has(key)) {
          locationMap.set(key, []);
        }
        locationMap.get(key)!.push(img);
      }
    });

    // Create markers for each location
    locationMap.forEach((locationImages, _key) => {
      const gps = locationImages[0].exif!.gps!;
      const marker = L.marker([gps.latitude, gps.longitude]);

      markerImageMap.current.set(marker, locationImages);

      marker.on('click', () => {
        onMarkerClick(locationImages);
      });

      // Add popup preview
      const previewImg = locationImages[0];
      const popupContent = `
        <div class="marker-popup">
          <img src="${previewImg.thumbnailUrl}" alt="${previewImg.filename}" />
          <div class="popup-info">
            ${locationImages.length > 1 ? `<span>${locationImages.length} photos</span>` : previewImg.filename}
          </div>
        </div>
      `;
      marker.bindPopup(popupContent, { className: 'photo-popup' });

      markers.addLayer(marker);
    });

    // Cluster click → open images (unless long press already triggered zoom)
    markers.on('clusterclick', (e: L.LeafletEvent) => {
      if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
      }
      const cluster = (e as any).layer;
      const childMarkers: L.Marker[] = cluster.getAllChildMarkers();
      const allImages: MapImage[] = [];
      for (const m of childMarkers) {
        const imgs = markerImageMap.current.get(m);
        if (imgs) allImages.push(...imgs);
      }
      if (allImages.length > 0) {
        onMarkerClick(allImages);
      }
    });

    map.addLayer(markers);

    // Long-press detection via DOM pointer events on cluster icons
    const container = map.getContainer();

    const onPointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest('.marker-cluster') as HTMLElement | null;
      if (!target) return;

      pointerStart.current = { x: e.clientX, y: e.clientY };
      target.classList.add('holding');
      holdingEl.current = target;

      // Find the cluster layer for this DOM element to get its bounds
      // We walk Leaflet's internal structures to match the DOM element
      let clusterBounds: L.LatLngBounds | null = null;
      markers.eachLayer((layer: L.Layer) => {
        // marker cluster layers have _icon property pointing to DOM element
        if ((layer as any)._icon === target || target.contains((layer as any)._icon) || (layer as any)._icon?.contains(target)) {
          if (typeof (layer as any).getBounds === 'function') {
            clusterBounds = (layer as any).getBounds();
          }
        }
      });

      // Also check cluster parents
      if (!clusterBounds) {
        // Try to find via the top-level clusters
        const findCluster = (group: any): L.LatLngBounds | null => {
          if (!group._featureGroup) return null;
          for (const id in group._featureGroup._layers) {
            const l = group._featureGroup._layers[id];
            if (l._icon === target || target.contains(l._icon) || l._icon?.contains(target)) {
              if (typeof l.getBounds === 'function') {
                return l.getBounds();
              }
            }
          }
          return null;
        };
        clusterBounds = findCluster(markers);
      }

      activeClusterBounds.current = clusterBounds;

      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        if (holdingEl.current) {
          holdingEl.current.classList.remove('holding');
          holdingEl.current = null;
        }
        if (activeClusterBounds.current) {
          map.fitBounds(activeClusterBounds.current, { padding: [50, 50] });
        }
        pointerStart.current = null;
        activeClusterBounds.current = null;
      }, 500);
    };

    const onPointerUp = () => clearLongPress();
    const onPointerCancel = () => clearLongPress();

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerStart.current) return;
      const dx = e.clientX - pointerStart.current.x;
      const dy = e.clientY - pointerStart.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearLongPress();
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerCancel);
    container.addEventListener('pointermove', onPointerMove);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerCancel);
      container.removeEventListener('pointermove', onPointerMove);
      clearLongPress();
      map.removeLayer(markers);
    };
  }, [map, images, onMarkerClick, clearLongPress]);

  return null;
}

// Fit map to bounds of all markers
function FitBounds({ images }: { images: MapImage[] }) {
  const map = useMap();

  useEffect(() => {
    if (images.length === 0) return;

    const bounds = L.latLngBounds(
      images
        .filter(img => img.exif?.gps)
        .map(img => [img.exif!.gps!.latitude, img.exif!.gps!.longitude] as [number, number])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [map, images]);

  return null;
}

export default function MapPage() {
  const [images, setImages] = useState<MapImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<MapImage[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    fetchMapImages()
      .then(data => {
        setImages(data.images);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleMarkerClick = (locationImages: MapImage[]) => {
    setSelectedImages(locationImages);
    setLightboxIndex(0);
  };

  const closeLightbox = () => {
    setSelectedImages(null);
    setLightboxIndex(0);
  };

  // Default center (will be overridden by FitBounds)
  const defaultCenter: [number, number] = [20, 0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-xl mb-2">No geotagged photos found</p>
          <p className="text-sm">Photos with GPS data will appear on the map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Map */}
      <div className="h-screen w-full">
        <MapContainer
          center={defaultCenter}
          zoom={2}
          className="h-full w-full"
          style={{ background: '#1a1a1a' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MarkerClusterGroup images={images} onMarkerClick={handleMarkerClick} />
          <FitBounds images={images} />
        </MapContainer>
      </div>

      {/* Selected images panel */}
      {selectedImages && selectedImages.length > 1 && !lightboxIndex && (
        <div
          className="fixed inset-0 bg-black/90 overflow-auto"
          style={{ zIndex: 1000 }}
          onClick={closeLightbox}
        >
          <div className="p-4 pt-16">
            <button
              onClick={closeLightbox}
              className="fixed top-4 right-4 p-2 text-white/70 hover:text-white"
              style={{ zIndex: 1001 }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-white text-lg mb-4 text-center">
              {selectedImages.length} photos at this location
              {selectedImages[0].albumName && (
                <span className="text-white/50 ml-2">from {selectedImages[0].albumName}</span>
              )}
            </h2>

            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedImages.map((img, idx) => (
                <div
                  key={img.path}
                  className="aspect-square cursor-pointer overflow-hidden rounded-lg hover:ring-2 hover:ring-white/50 transition-all"
                  onClick={() => setLightboxIndex(idx + 1)}
                >
                  <img
                    src={img.thumbnailUrl}
                    alt={img.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for single image or selected from grid */}
      {selectedImages && (lightboxIndex > 0 || selectedImages.length === 1) && (
        <div style={{ zIndex: 1000 }}>
          <Lightbox
            image={selectedImages[selectedImages.length === 1 ? 0 : lightboxIndex - 1]}
            onClose={() => {
              if (selectedImages.length === 1) {
                closeLightbox();
              } else {
                setLightboxIndex(0);
              }
            }}
            onNext={() => {
              const maxIdx = selectedImages.length === 1 ? 1 : selectedImages.length;
              const currentIdx = selectedImages.length === 1 ? 0 : lightboxIndex - 1;
              if (currentIdx < maxIdx - 1) {
                setLightboxIndex(currentIdx + 2);
              }
            }}
            onPrev={() => {
              const currentIdx = selectedImages.length === 1 ? 0 : lightboxIndex - 1;
              if (currentIdx > 0) {
                setLightboxIndex(currentIdx);
              }
            }}
            hasNext={
              selectedImages.length === 1
                ? false
                : lightboxIndex - 1 < selectedImages.length - 1
            }
            hasPrev={
              selectedImages.length === 1
                ? false
                : lightboxIndex - 1 > 0
            }
          />
        </div>
      )}

      {/* Photo count indicator */}
      <div className="fixed bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white/80 z-10">
        {images.length} geotagged photos
      </div>
    </div>
  );
}
