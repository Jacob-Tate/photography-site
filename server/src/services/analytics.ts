import fs from 'fs';
import path from 'path';
import { config } from '../config';

const ANALYTICS_FILE = path.join(config.photosDir, '.analytics.json');
const FLUSH_INTERVAL = 60_000; // 60 seconds

interface AnalyticsData {
  albumViews: Record<string, number>;
  photoViews: Record<string, number>;
  uniqueIPs: string[];
}

const albumViews = new Map<string, number>();
const photoViews = new Map<string, number>();
const uniqueIPs = new Set<string>();
let dirty = false;

function loadFromDisk(): void {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const raw = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      const data: AnalyticsData = JSON.parse(raw);

      if (data.albumViews) {
        for (const [k, v] of Object.entries(data.albumViews)) {
          albumViews.set(k, v);
        }
      }
      if (data.photoViews) {
        for (const [k, v] of Object.entries(data.photoViews)) {
          photoViews.set(k, v);
        }
      }
      if (data.uniqueIPs) {
        for (const ip of data.uniqueIPs) {
          uniqueIPs.add(ip);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

function flushToDisk(): void {
  if (!dirty) return;
  try {
    const data: AnalyticsData = {
      albumViews: Object.fromEntries(albumViews),
      photoViews: Object.fromEntries(photoViews),
      uniqueIPs: Array.from(uniqueIPs),
    };
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
    dirty = false;
  } catch (err) {
    console.error('Failed to flush analytics:', err);
  }
}

export function initAnalytics(): void {
  loadFromDisk();
  setInterval(flushToDisk, FLUSH_INTERVAL);
}

export function recordAlbumView(albumPath: string): void {
  albumViews.set(albumPath, (albumViews.get(albumPath) || 0) + 1);
  dirty = true;
}

export function recordPhotoView(photoPath: string): void {
  photoViews.set(photoPath, (photoViews.get(photoPath) || 0) + 1);
  dirty = true;
}

export function recordIP(ip: string): void {
  if (!uniqueIPs.has(ip)) {
    uniqueIPs.add(ip);
    dirty = true;
  }
}

export function getAnalyticsSummary() {
  const totalAlbumViews = Array.from(albumViews.values()).reduce((s, v) => s + v, 0);
  const totalPhotoViews = Array.from(photoViews.values()).reduce((s, v) => s + v, 0);

  const topAlbums = Array.from(albumViews.entries())
    .map(([name, views]) => ({ name, count: views }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topPhotos = Array.from(photoViews.entries())
    .map(([name, views]) => ({ name, count: views }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalViews: totalAlbumViews + totalPhotoViews,
    uniqueVisitors: uniqueIPs.size,
    uniqueIPList: Array.from(uniqueIPs),
    topAlbums,
    topPhotos,
  };
}
