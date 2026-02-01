import { Router } from 'express';
import { scanPortfolio, scanAlbums, scanAlbumImages } from '../services/scanner';
import { ImageInfo } from '../types';
import { isStatsIgnored, isPortfolioStatsIgnored } from '../services/ignoreStats';

const router = Router();

export interface SearchResult extends ImageInfo {
  albumName?: string;
  albumPath?: string;
}

// GET /api/search?q=keyword
router.get('/', async (req, res) => {
  try {
    const query = (req.query.q as string || '').toLowerCase().trim();

    if (!query) {
      res.json({ results: [] });
      return;
    }

    const results: SearchResult[] = [];

    // Search portfolio images
    if (!isPortfolioStatsIgnored()) {
      const portfolioImages = await scanPortfolio();
      for (const img of portfolioImages) {
        if (img.exif?.keywords?.some(k => k.toLowerCase().includes(query))) {
          results.push({ ...img, albumName: 'Portfolio', albumPath: 'portfolio' });
        }
      }
    }

    // Search all album images
    const albumTree = await scanAlbums();

    // Process top-level albums
    for (const album of albumTree.albums) {
      if (isStatsIgnored(album.path)) continue;
      const images = await scanAlbumImages(album.path);
      for (const img of images) {
        if (img.exif?.keywords?.some(k => k.toLowerCase().includes(query))) {
          results.push({ ...img, albumName: album.name, albumPath: album.path });
        }
      }
    }

    // Process group albums
    for (const group of albumTree.groups) {
      for (const album of group.albums) {
        if (isStatsIgnored(album.path)) continue;
        const images = await scanAlbumImages(album.path);
        for (const img of images) {
          if (img.exif?.keywords?.some(k => k.toLowerCase().includes(query))) {
            results.push({ ...img, albumName: `${group.name} / ${album.name}`, albumPath: album.path });
          }
        }
      }
    }

    res.json({ results, query });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
