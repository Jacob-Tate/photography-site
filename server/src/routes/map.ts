import { Router } from 'express';
import { scanPortfolio, scanAlbums, scanAlbumImages } from '../services/scanner';
import { ImageInfo } from '../types';

const router = Router();

export interface MapImage extends ImageInfo {
  albumName?: string;
  albumPath?: string;
}

// GET /api/map - returns all images with GPS data
router.get('/', async (_req, res) => {
  try {
    const mapImages: MapImage[] = [];

    // Get portfolio images
    const portfolioImages = await scanPortfolio();
    for (const img of portfolioImages) {
      if (img.exif?.gps) {
        mapImages.push({ ...img, albumName: 'Portfolio', albumPath: 'portfolio' });
      }
    }

    // Get all album images
    const albumTree = scanAlbums();

    // Process top-level albums
    for (const album of albumTree.albums) {
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
