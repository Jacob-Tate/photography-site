import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { scanPortfolio, scanAlbums, scanAlbumImages, listImageFiles } from '../services/scanner';
import { PORTFOLIO_DIR, ALBUMS_DIR } from '../config';
import { ImageInfo } from '../types';
import { isStatsIgnored, isPortfolioStatsIgnored } from '../services/ignoreStats';
import { getAnalyticsSummary } from '../services/analytics';

const router = Router();

interface FrequencyEntry {
  name: string;
  count: number;
}

function addToMap(map: Map<string, number>, key: string | undefined) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function mapToSorted(map: Map<string, number>): FrequencyEntry[] {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function parseYear(dateTaken: string | undefined): string | null {
  if (!dateTaken) return null;
  const match = dateTaken.match(/(\d{4})/);
  return match ? match[1] : null;
}

function parseHour(dateTaken: string | undefined): number | null {
  if (!dateTaken) return null;
  // Format: "Jan 15, 2025 at 3:30 PM"
  const match = dateTaken.match(/at (\d{1,2}):(\d{2}) (AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'AM' && hour === 12) hour = 0;
  else if (ampm === 'PM' && hour !== 12) hour += 12;
  return hour;
}

router.get('/filter', async (req, res) => {
  try {
    const field = req.query.field as string;
    const value = req.query.value as string;

    const validFields = ['camera', 'lens', 'focalLength', 'aperture', 'shutterSpeed', 'iso', 'year', 'hour'];
    if (!field || !value || !validFields.includes(field)) {
      res.status(400).json({ error: 'Invalid field or value' });
      return;
    }

    interface FilterResult extends ImageInfo {
      albumName?: string;
      albumPath?: string;
    }

    const results: FilterResult[] = [];

    const matchImage = (img: ImageInfo): boolean => {
      const exif = img.exif;
      if (!exif) return false;
      switch (field) {
        case 'camera': return exif.camera === value;
        case 'lens': return exif.lens === value;
        case 'focalLength': return exif.focalLength === value;
        case 'aperture': return exif.aperture === value;
        case 'shutterSpeed': return exif.shutterSpeed === value;
        case 'iso': return String(exif.iso) === value;
        case 'year': return parseYear(exif.dateTaken) === value;
        case 'hour': return String(parseHour(exif.dateTaken)) === value;
        default: return false;
      }
    };

    // Portfolio
    if (!isPortfolioStatsIgnored()) {
      const portfolioImages = await scanPortfolio();
      for (const img of portfolioImages) {
        if (matchImage(img)) {
          results.push(img);
        }
      }
    }

    // Albums
    const albumTree = await scanAlbums();
    for (const album of albumTree.albums) {
      if (isStatsIgnored(album.path)) continue;
      const images = await scanAlbumImages(album.path);
      for (const img of images) {
        if (matchImage(img)) {
          results.push({ ...img, albumName: album.name, albumPath: album.path });
        }
      }
    }

    for (const group of albumTree.groups) {
      for (const album of group.albums) {
        if (isStatsIgnored(album.path)) continue;
        const images = await scanAlbumImages(album.path);
        for (const img of images) {
          if (matchImage(img)) {
            results.push({ ...img, albumName: album.name, albumPath: album.path });
          }
        }
      }
    }

    res.json({ results, field, value });
  } catch (err) {
    console.error('Stats filter error:', err);
    res.status(500).json({ error: 'Failed to filter stats' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const cameras = new Map<string, number>();
    const lenses = new Map<string, number>();
    const focalLengths = new Map<string, number>();
    const apertures = new Map<string, number>();
    const shutterSpeeds = new Map<string, number>();
    const isos = new Map<string, number>();
    const years = new Map<string, number>();
    const byHour: number[] = new Array(24).fill(0);

    let totalPhotos = 0;
    let geotaggedCount = 0;
    let keywordedCount = 0;
    let diskUsageBytes = 0;

    const processImages = (images: ImageInfo[]) => {
      for (const img of images) {
        totalPhotos++;
        const exif = img.exif;
        if (!exif) continue;

        addToMap(cameras, exif.camera);
        addToMap(lenses, exif.lens);
        addToMap(focalLengths, exif.focalLength);
        addToMap(apertures, exif.aperture);
        addToMap(shutterSpeeds, exif.shutterSpeed);
        if (exif.iso !== undefined) {
          addToMap(isos, String(exif.iso));
        }

        if (exif.gps) geotaggedCount++;
        if (exif.keywords && exif.keywords.length > 0) keywordedCount++;

        const year = parseYear(exif.dateTaken);
        if (year) {
          years.set(year, (years.get(year) || 0) + 1);
        }

        const hour = parseHour(exif.dateTaken);
        if (hour !== null) {
          byHour[hour]++;
        }
      }
    };

    // Portfolio
    if (!isPortfolioStatsIgnored()) {
      const portfolioImages = await scanPortfolio();
      processImages(portfolioImages);

      // Disk usage for portfolio
      const portfolioFiles = listImageFiles(PORTFOLIO_DIR);
      for (const f of portfolioFiles) {
        try {
          diskUsageBytes += fs.statSync(path.join(PORTFOLIO_DIR, f)).size;
        } catch { /* skip */ }
      }
    }

    // Albums
    const albumTree = await scanAlbums();
    const totalGroups = albumTree.groups.length;
    let totalAlbums = albumTree.albums.length;

    for (const album of albumTree.albums) {
      if (isStatsIgnored(album.path)) {
        totalAlbums--;
        continue;
      }
      const images = await scanAlbumImages(album.path);
      processImages(images);

      const albumDir = path.join(ALBUMS_DIR, album.path.replace(/^albums\//, ''));
      const files = listImageFiles(albumDir);
      for (const f of files) {
        try {
          diskUsageBytes += fs.statSync(path.join(albumDir, f)).size;
        } catch { /* skip */ }
      }
    }

    for (const group of albumTree.groups) {
      for (const album of group.albums) {
        if (isStatsIgnored(album.path)) continue;
        totalAlbums++;
        const images = await scanAlbumImages(album.path);
        processImages(images);

        const albumDir = path.join(ALBUMS_DIR, album.path.replace(/^albums\//, ''));
        const files = listImageFiles(albumDir);
        for (const f of files) {
          try {
            diskUsageBytes += fs.statSync(path.join(albumDir, f)).size;
          } catch { /* skip */ }
        }
      }
    }

    // Sort years chronologically
    const byYear = Array.from(years.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));

    res.json({
      totalPhotos,
      totalAlbums,
      totalGroups,
      diskUsageBytes,
      cameras: mapToSorted(cameras),
      lenses: mapToSorted(lenses),
      focalLengths: mapToSorted(focalLengths),
      apertures: mapToSorted(apertures),
      shutterSpeeds: mapToSorted(shutterSpeeds),
      isos: mapToSorted(isos),
      byYear,
      byHour,
      geotaggedCount,
      keywordedCount,
      ...getAnalyticsSummary(),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

export default router;
