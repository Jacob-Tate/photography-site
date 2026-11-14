import { Router } from 'express';
import { scanPortfolio, scanAlbums, scanAlbumImages } from '../services/scanner';
import { ImageInfo } from '../types';
import { isStatsIgnored, isPortfolioStatsIgnored } from '../services/ignoreStats';
import { config } from '../config';

const router = Router();

const CARTO_TILE_URL = 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';

/**
 * Builds the basemap tile URL. CARTO requires an API key (sent as ?key=);
 * without one, tiles render with an "API KEY REQUIRED" watermark.
 * The key is shipped to browsers by design, so restrict it to your domain in the CARTO dashboard.
 */
export function buildTileUrl(apiKey: string): string {
  return apiKey ? `${CARTO_TILE_URL}?key=${encodeURIComponent(apiKey)}` : CARTO_TILE_URL;
}

let warnedMissingKey = false;

// GET /api/map/tiles - returns the basemap tile URL template for Leaflet
router.get('/tiles', (_req, res) => {
  if (!config.cartoApiKey && !warnedMissingKey) {
    console.warn('CARTO_API_KEY is not set; map tiles will show an "API KEY REQUIRED" watermark');
    warnedMissingKey = true;
  }
  res.json({ url: buildTileUrl(config.cartoApiKey) });
});

export interface MapImage extends ImageInfo {
  albumName?: string;
  albumPath?: string;
}

// GET /api/map - returns all images with GPS data
router.get('/', async (_req, res) => {
  try {
    const mapImages: MapImage[] = [];

    // Get portfolio images
    if (!isPortfolioStatsIgnored()) {
      const portfolioImages = await scanPortfolio();
      for (const img of portfolioImages) {
        if (img.exif?.gps) {
          mapImages.push({ ...img, albumName: 'Portfolio', albumPath: 'portfolio' });
        }
      }
    }

    // Get all album images
    const albumTree = await scanAlbums();

    // Process top-level albums
    for (const album of albumTree.albums) {
      if (isStatsIgnored(album.path)) continue;
      const images = await scanAlbumImages(album.path);
      for (const img of images) {
        if (img.exif?.gps) {
          mapImages.push({ ...img, albumName: album.name, albumPath: album.path });
        }
      }
    }

    // Process group albums
    for (const group of albumTree.groups) {
      for (const album of group.albums) {
        if (isStatsIgnored(album.path)) continue;
        const images = await scanAlbumImages(album.path);
        for (const img of images) {
          if (img.exif?.gps) {
            mapImages.push({ ...img, albumName: `${group.name} / ${album.name}`, albumPath: album.path });
          }
        }
      }
    }

    res.json({ images: mapImages });
  } catch (err) {
    console.error('Map data error:', err);
    res.status(500).json({ error: 'Failed to load map data' });
  }
});

export default router;
