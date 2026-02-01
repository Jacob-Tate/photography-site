import { Router } from 'express';
import { scanPortfolio, scanAlbums, scanAlbumImages } from '../services/scanner';
import { isStatsIgnored, isPortfolioStatsIgnored } from '../services/ignoreStats';

const router = Router();

// GET /api/tags - returns all keywords with frequency counts
router.get('/', async (_req, res) => {
  try {
    const tagCounts = new Map<string, number>();

    // Get portfolio images
    if (!isPortfolioStatsIgnored()) {
      const portfolioImages = await scanPortfolio();
      for (const img of portfolioImages) {
        if (img.exif?.keywords) {
          for (const kw of img.exif.keywords) {
            tagCounts.set(kw, (tagCounts.get(kw) || 0) + 1);
          }
        }
      }
    }

    // Get all album images
    const albumTree = scanAlbums();

    // Process top-level albums
    for (const album of albumTree.albums) {
      if (isStatsIgnored(album.path)) continue;
      const images = await scanAlbumImages(album.path);
      for (const img of images) {
        if (img.exif?.keywords) {
          for (const kw of img.exif.keywords) {
            tagCounts.set(kw, (tagCounts.get(kw) || 0) + 1);
          }
        }
      }
    }

    // Process group albums
    for (const group of albumTree.groups) {
      for (const album of group.albums) {
        if (isStatsIgnored(album.path)) continue;
        const images = await scanAlbumImages(album.path);
        for (const img of images) {
          if (img.exif?.keywords) {
            for (const kw of img.exif.keywords) {
              tagCounts.set(kw, (tagCounts.get(kw) || 0) + 1);
            }
          }
        }
      }
    }

    const tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ tags });
  } catch (err) {
    console.error('Tags error:', err);
    res.status(500).json({ error: 'Failed to load tags' });
  }
});

export default router;
