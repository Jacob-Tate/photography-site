import { useEffect, useState } from 'react';
import { fetchMapTileUrl } from '../api/client';

// Keyless fallback: tiles still load, but CARTO overlays an "API KEY REQUIRED" watermark.
export const FALLBACK_TILE_URL = 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Shared across map instances so the config is fetched once per page load.
let tileUrlPromise: Promise<string> | null = null;

function loadTileUrl(): Promise<string> {
  if (!tileUrlPromise) {
    tileUrlPromise = fetchMapTileUrl()
      .then(({ url }) => url)
      .catch((err: unknown) => {
        console.error('Failed to load map tile URL, using keyless fallback:', err);
        tileUrlPromise = null; // allow a retry on the next map mount
        return FALLBACK_TILE_URL;
      });
  }
  return tileUrlPromise;
}

/** Returns the basemap tile URL template, or null while it is loading. */
export function useTileUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTileUrl().then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return url;
}
