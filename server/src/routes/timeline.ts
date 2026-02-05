import { Router } from 'express';
import { scanPortfolio, scanAlbums, scanAlbumImages } from '../services/scanner';
import { ImageInfo } from '../types';
import { isStatsIgnored, isPortfolioStatsIgnored } from '../services/ignoreStats';

const router = Router();

// Simple in-memory cache to avoid re-scanning filesystem on every scroll event
let cachedTimeline: ImageInfo[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function parseDate(dateStr?: string): number {
  if (!dateStr) return 0;
  // Format: "Jan 15, 2025 at 3:30 PM"
  return new Date(dateStr.replace(' at ', ' ')).getTime();
}

async function getFullTimeline() {
  if (cachedTimeline && Date.now() - lastCacheTime < CACHE_TTL) {
    return cachedTimeline;
  }

  const allImages: ImageInfo[] = [];

  // 1. Portfolio
  if (!isPortfolioStatsIgnored()) {
    try {
      const portfolio = await scanPortfolio();
      allImages.push(...portfolio);
    } catch (e) {
      console.error('Error scanning portfolio for timeline:', e);
    }
  }

  // 2. Albums
  try {
    const tree = await scanAlbums();
    
    const processAlbum = async (albumPath: string) => {
      if (isStatsIgnored(albumPath)) return;
      try {
        const images = await scanAlbumImages(albumPath);
        // We push the images directly; they already contain path/url info
        allImages.push(...images);
      } catch (e) {
        console.error(`Error scanning album ${albumPath} for timeline:`, e);
      }
    };

    // Process top-level albums
    for (const album of tree.albums) {
      await processAlbum(album.path);
    }

    // Process grouped albums
    for (const group of tree.groups) {
      for (const album of group.albums) {
        await processAlbum(album.path);
      }
    }
  } catch (e) {
    console.error('Error scanning albums for timeline:', e);
  }

  // 3. Sort by date descending
  allImages.sort((a, b) => {
    const dateA = parseDate(a.exif?.dateTaken);
    const dateB = parseDate(b.exif?.dateTaken);
    // Sort undated photos to the bottom
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB - dateA;
  });

  cachedTimeline = allImages;
  lastCacheTime = Date.now();
  return allImages;
}

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  try {
    const all = await getFullTimeline();
    const slice = all.slice(offset, offset + limit);
    
    res.json({
      images: slice,
      total: all.length,
      hasMore: offset + limit < all.length
    });
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ error: 'Failed to load timeline' });
  }
});

export default router;