import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import iptcReader from 'iptc-reader';
import { IMAGE_EXTENSIONS, PORTFOLIO_DIR, ALBUMS_DIR, config } from '../config';
import { ImageInfo, AlbumInfo, GroupInfo, AlbumTree, ExifData } from '../types';
import { renderMarkdown } from '../services/markdown';

interface CachedMetadata {
  mtimeMs: number;
  width: number;
  height: number;
  exif?: ExifData;
}

const metadataCache = new Map<string, CachedMetadata>();
const CACHE_FILE = path.join(config.photosDir, '.metadata-cache.json');

function loadDiskCache(): void {
  try {
    if (!fs.existsSync(CACHE_FILE)) return;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as Record<string, CachedMetadata>;
    for (const [key, value] of Object.entries(data)) {
      metadataCache.set(key, value);
    }
    console.log(`[metadata] Loaded ${metadataCache.size} entries from disk cache`);
  } catch {
    console.log('[metadata] Could not load disk cache, starting fresh');
  }
}

function saveDiskCache(): void {
  try {
    const obj: Record<string, CachedMetadata> = {};
    for (const [key, value] of metadataCache) {
      obj[key] = value;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj));
    console.log(`[metadata] Saved ${metadataCache.size} entries to disk cache`);
  } catch {
    console.log('[metadata] Could not save disk cache');
  }
}

export function isHiddenDir(name: string): boolean {
  return name.startsWith('.') || name === '@eadir' || name === '@EaDir';
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

function formatAlbumName(dirname: string): string {
  return dirname.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formatAspectRatio(width: number, height: number): string {
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;
  // Simplify common ratios
  if ((w === 3 && h === 2) || (w === 2 && h === 3)) return '3:2';
  if ((w === 4 && h === 3) || (w === 3 && h === 4)) return '4:3';
  if ((w === 16 && h === 9) || (w === 9 && h === 16)) return '16:9';
  if ((w === 1 && h === 1)) return '1:1';
  if (w > 20 || h > 20) {
    // For complex ratios, approximate to common ones
    const ratio = width / height;
    if (Math.abs(ratio - 1.5) < 0.05) return '3:2';
    if (Math.abs(ratio - 1.33) < 0.05) return '4:3';
    if (Math.abs(ratio - 1.78) < 0.05) return '16:9';
    if (Math.abs(ratio - 0.67) < 0.05) return '2:3';
    if (Math.abs(ratio - 0.75) < 0.05) return '3:4';
    if (Math.abs(ratio - 0.56) < 0.05) return '9:16';
  }
  return `${w}:${h}`;
}

async function getImageMetadata(filePath: string): Promise<{ width: number; height: number; exif?: ExifData }> {
  const mtimeMs = fs.statSync(filePath).mtimeMs;
  const cached = metadataCache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs) {
    return { width: cached.width, height: cached.height, exif: cached.exif };
  }

  const metadata = await sharp(filePath).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Start with dimension info (always available)
  const exif: ExifData = {};

  // Extract keywords from IPTC
  if (metadata.iptc) {
    try {
      const iptc = iptcReader(metadata.iptc);
      if (iptc.keywords) {
        // Keywords can be a string (single) or array (multiple)
        if (Array.isArray(iptc.keywords)) {
          if (iptc.keywords.length > 0) {
            exif.keywords = iptc.keywords;
          }
        } else if (typeof iptc.keywords === 'string' && iptc.keywords.length > 0) {
          exif.keywords = [iptc.keywords];
        }
      }
    } catch {
      // IPTC parsing failed, continue without keywords
    }
  }

  // Extract keywords from XMP (used by Lightroom, Photoshop, etc.)
  if (!exif.keywords && metadata.xmp) {
    try {
      const xmpString = metadata.xmp.toString('utf8');
      // Parse dc:subject tags which contain keywords
      // Format: <dc:subject><rdf:Bag><rdf:li>keyword</rdf:li>...</rdf:Bag></dc:subject>
      // Or: <dc:subject><rdf:Seq><rdf:li>keyword</rdf:li>...</rdf:Seq></dc:subject>
      const subjectMatch = xmpString.match(/<dc:subject[^>]*>([\s\S]*?)<\/dc:subject>/i);
      if (subjectMatch) {
        const keywords: string[] = [];
        const liRegex = /<rdf:li[^>]*>([^<]+)<\/rdf:li>/gi;
        let match;
        while ((match = liRegex.exec(subjectMatch[1])) !== null) {
          keywords.push(match[1].trim());
        }
        if (keywords.length > 0) {
          exif.keywords = keywords;
        }
      }

      // Also try lr:hierarchicalSubject for Lightroom hierarchical keywords
      if (!exif.keywords) {
        const lrMatch = xmpString.match(/<lr:hierarchicalSubject[^>]*>([\s\S]*?)<\/lr:hierarchicalSubject>/i);
        if (lrMatch) {
          const keywords: string[] = [];
          const liRegex = /<rdf:li[^>]*>([^<]+)<\/rdf:li>/gi;
          let match;
          while ((match = liRegex.exec(lrMatch[1])) !== null) {
            // Hierarchical keywords use | as separator, take the last part
            const parts = match[1].split('|');
            keywords.push(parts[parts.length - 1].trim());
          }
          if (keywords.length > 0) {
            exif.keywords = [...new Set(keywords)]; // Remove duplicates
          }
        }
      }
    } catch {
      // XMP parsing failed, continue without keywords
    }
  }

  if (width && height) {
    exif.dimensions = `${width} × ${height}`;
    exif.aspectRatio = formatAspectRatio(width, height);
    const mp = (width * height) / 1000000;
    exif.megapixels = mp >= 1 ? `${mp.toFixed(1)} MP` : `${(mp * 1000).toFixed(0)} KP`;
  }

  // Color space from sharp metadata
  if (metadata.space) {
    exif.colorSpace = metadata.space.toUpperCase();
  }

  if (metadata.exif) {
    try {
      const parsed = exifReader(metadata.exif);

      // Camera make and model
      if (parsed.Image?.Make || parsed.Image?.Model) {
        const make = parsed.Image?.Make?.toString().trim() || '';
        const model = parsed.Image?.Model?.toString().trim() || '';
        // Avoid duplicating make in model (e.g., "Canon Canon EOS R5")
        exif.camera = model.startsWith(make) ? model : `${make} ${model}`.trim();
      }

      // Lens info
      if (parsed.Photo?.LensModel) {
        exif.lens = parsed.Photo.LensModel.toString();
      }

      // Focal length
      if (parsed.Photo?.FocalLength) {
        exif.focalLength = `${parsed.Photo.FocalLength}mm`;
      }

      // Aperture (FNumber)
      if (parsed.Photo?.FNumber) {
        exif.aperture = `f/${parsed.Photo.FNumber}`;
      }

      // Shutter speed (ExposureTime)
      if (parsed.Photo?.ExposureTime) {
        const exposure = parsed.Photo.ExposureTime;
        if (exposure >= 1) {
          exif.shutterSpeed = `${exposure}s`;
        } else {
          // Convert to fraction (e.g., 1/250)
          const denominator = Math.round(1 / exposure);
          exif.shutterSpeed = `1/${denominator}s`;
        }
      }

      // ISO
      if (parsed.Photo?.ISOSpeedRatings) {
        exif.iso = Array.isArray(parsed.Photo.ISOSpeedRatings)
          ? parsed.Photo.ISOSpeedRatings[0]
          : parsed.Photo.ISOSpeedRatings;
      }

      // Date and time taken
      // EXIF DateTimeOriginal is local camera time without timezone
      // exif-reader returns it as a Date, but we need to extract the values
      // without timezone conversion to preserve the original camera time
      if (parsed.Photo?.DateTimeOriginal) {
        const date = parsed.Photo.DateTimeOriginal;
        if (date instanceof Date) {
          // Use UTC methods since exif-reader often stores the "local" time in UTC fields
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = months[date.getUTCMonth()];
          const day = date.getUTCDate();
          const year = date.getUTCFullYear();
          const hours = date.getUTCHours();
          const minutes = date.getUTCMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const hour12 = hours % 12 || 12;
          const minuteStr = minutes.toString().padStart(2, '0');
          exif.dateTaken = `${month} ${day}, ${year} at ${hour12}:${minuteStr} ${ampm}`;
        }
      }

      // Exposure compensation
      if (parsed.Photo?.ExposureBiasValue !== undefined) {
        const ev = parsed.Photo.ExposureBiasValue;
        if (ev === 0) {
          exif.exposureComp = '±0 EV';
        } else if (ev > 0) {
          exif.exposureComp = `+${ev.toFixed(1)} EV`;
        } else {
          exif.exposureComp = `${ev.toFixed(1)} EV`;
        }
      }

      // White balance
      if (parsed.Photo?.WhiteBalance !== undefined) {
        exif.whiteBalance = parsed.Photo.WhiteBalance === 0 ? 'Auto' : 'Manual';
      }

      // Flash
      if (parsed.Photo?.Flash !== undefined) {
        const flash = parsed.Photo.Flash;
        // Flash value is a bitmask, bit 0 indicates if flash fired
        exif.flash = (flash & 1) ? 'Fired' : 'Off';
      }

      // GPS location
      if (parsed.GPSInfo?.GPSLatitude && parsed.GPSInfo?.GPSLongitude) {
        try {
          const lat = parsed.GPSInfo.GPSLatitude;
          const lon = parsed.GPSInfo.GPSLongitude;
          const latRef = parsed.GPSInfo.GPSLatitudeRef || 'N';
          const lonRef = parsed.GPSInfo.GPSLongitudeRef || 'E';

          // Convert DMS (degrees, minutes, seconds) array to decimal
          const toDecimal = (dms: number[]): number => {
            if (dms.length >= 3) {
              return dms[0] + dms[1] / 60 + dms[2] / 3600;
            } else if (dms.length === 2) {
              return dms[0] + dms[1] / 60;
            }
            return dms[0] || 0;
          };

          let latitude = toDecimal(lat);
          let longitude = toDecimal(lon);

          // Apply reference direction
          if (latRef === 'S') latitude = -latitude;
          if (lonRef === 'W') longitude = -longitude;

          exif.gps = { latitude, longitude };

          // Add altitude if available
          if (parsed.GPSInfo.GPSAltitude !== undefined) {
            let altitude = parsed.GPSInfo.GPSAltitude;
            // GPSAltitudeRef: 0 = above sea level, 1 = below sea level
            if (parsed.GPSInfo.GPSAltitudeRef === 1) {
              altitude = -altitude;
            }
            exif.gps.altitude = Math.round(altitude);
          }
        } catch {
          // GPS parsing failed, continue without it
        }
      }

    } catch {
      // EXIF parsing failed, continue with just dimension data
    }
  }

  // Only return exif if we have any meaningful data
  const hasData = Object.keys(exif).length > 0;
  const result = { width, height, exif: hasData ? exif : undefined };

  metadataCache.set(filePath, { mtimeMs, ...result });

  return result;
}

export function listImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => isImageFile(f) && !isHiddenDir(f))
    .sort();
}

async function getImageCaption(filePath: string): Promise<string | undefined> {
  const mdPath = filePath.replace(/\.[^.]+$/, '.md');
  if (fs.existsSync(mdPath)) {
    const raw = fs.readFileSync(mdPath, 'utf-8');
    return await renderMarkdown(raw);
  }
  return undefined;
}

export async function scanPortfolio(): Promise<ImageInfo[]> {
  const files = listImageFiles(PORTFOLIO_DIR);
  const images: ImageInfo[] = [];

  for (const filename of files) {
    const filePath = path.join(PORTFOLIO_DIR, filename);
    const { width, height, exif } = await getImageMetadata(filePath);
    const caption = await getImageCaption(filePath);
    images.push({
      filename,
      path: `portfolio/${filename}`,
      width,
      height,
      thumbnailUrl: `/api/images/thumbnail/portfolio/${filename}`,
      fullUrl: `/api/images/full/portfolio/${filename}`,
      downloadUrl: `/api/images/download/portfolio/${filename}`,
      exif,
      caption,
    });
  }

  return images;
}

function hasDirectImages(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some(f => isImageFile(f));
}

function hasSubdirectories(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some(f => {
    const full = path.join(dir, f);
    return fs.statSync(full).isDirectory() && !isHiddenDir(f);
  });
}

// Sort entries: date-prefixed names (YYYYMMDD) sort newest-first, others alphabetically
function albumSort(a: string, b: string): number {
  const datePattern = /^\d{8}/;
  const aIsDate = datePattern.test(a);
  const bIsDate = datePattern.test(b);

  if (aIsDate && bIsDate) {
    return b.localeCompare(a);
  }
  return a.localeCompare(b);
}

function getCoverImage(albumDir: string, images: string[]): string | undefined {
  const coverFile = path.join(albumDir, 'cover.txt');
  if (fs.existsSync(coverFile)) {
    const coverName = fs.readFileSync(coverFile, 'utf-8').trim();
    if (coverName && images.includes(coverName)) {
      return coverName;
    }
  }
  return images[0];
}

function getAlbumUpdatedAt(albumDir: string, images: string[]): number {
  let maxMtime = 0;
  for (const img of images) {
    try {
      const mtime = fs.statSync(path.join(albumDir, img)).mtimeMs;
      if (mtime > maxMtime) maxMtime = mtime;
    } catch { /* skip */ }
  }
  return maxMtime;
}

async function buildAlbumInfo(albumDir: string, albumPath: string): Promise<AlbumInfo> {
  const name = path.basename(albumDir);
  const images = listImageFiles(albumDir);
  const hasPassword = fs.existsSync(path.join(albumDir, 'password.txt'));
  const cover = images.length > 0 ? getCoverImage(albumDir, images) : undefined;
  const updatedAt = getAlbumUpdatedAt(albumDir, images);

  let coverWidth: number | undefined;
  let coverHeight: number | undefined;
  if (cover && !hasPassword) {
    try {
      const meta = await getImageMetadata(path.join(albumDir, cover));
      coverWidth = meta.width;
      coverHeight = meta.height;
    } catch { /* skip */ }
  }

  return {
    name: formatAlbumName(name),
    slug: name,
    path: albumPath,
    coverImage: cover && !hasPassword
      ? `/api/images/thumbnail/${albumPath}/${cover}`
      : null,
    coverWidth,
    coverHeight,
    imageCount: images.length,
    hasPassword,
    updatedAt: updatedAt || undefined,
  };
}

export async function scanAlbums(): Promise<AlbumTree> {
  if (!fs.existsSync(ALBUMS_DIR)) {
    return { groups: [], albums: [] };
  }

  const entries = fs.readdirSync(ALBUMS_DIR).filter(f => {
    const full = path.join(ALBUMS_DIR, f);
    return fs.statSync(full).isDirectory() && !isHiddenDir(f);
  }).sort(albumSort);

  const groups: GroupInfo[] = [];
  const topAlbums: AlbumInfo[] = [];

  for (const entry of entries) {
    const entryDir = path.join(ALBUMS_DIR, entry);
    const albumPath = `albums/${entry}`;

    if (hasDirectImages(entryDir)) {
      // It's a top-level album
      topAlbums.push(await buildAlbumInfo(entryDir, albumPath));
    } else if (hasSubdirectories(entryDir)) {
      // It's a group
      const subEntries = fs.readdirSync(entryDir).filter(f => {
        const full = path.join(entryDir, f);
        return fs.statSync(full).isDirectory() && !isHiddenDir(f);
      }).sort(albumSort);

      const groupAlbums = await Promise.all(
        subEntries
          .filter(sub => hasDirectImages(path.join(entryDir, sub)))
          .map(sub => buildAlbumInfo(
            path.join(entryDir, sub),
            `albums/${entry}/${sub}`
          ))
      );

      if (groupAlbums.length > 0) {
        groups.push({
          name: formatAlbumName(entry),
          slug: entry,
          albums: groupAlbums,
        });
      }
    }
  }

  return { groups, albums: topAlbums };
}

export async function scanAlbumImages(albumPath: string): Promise<ImageInfo[]> {
  const fullDir = path.join(ALBUMS_DIR, albumPath.replace(/^albums\//, ''));

  if (!fs.existsSync(fullDir)) return [];

  const files = listImageFiles(fullDir);
  const images: ImageInfo[] = [];

  for (const filename of files) {
    const filePath = path.join(fullDir, filename);
    const { width, height, exif } = await getImageMetadata(filePath);
    const caption = await getImageCaption(filePath);
    const imgPath = `${albumPath}/${filename}`;
    images.push({
      filename,
      path: imgPath,
      width,
      height,
      thumbnailUrl: `/api/images/thumbnail/${imgPath}`,
      fullUrl: `/api/images/full/${imgPath}`,
      downloadUrl: `/api/images/download/${imgPath}`,
      exif,
      caption,
    });
  }

  return images;
}

export function getAlbumReadme(albumPath: string): string | undefined {
  const fullDir = path.join(ALBUMS_DIR, albumPath.replace(/^albums\//, ''));
  
  // Check for README in various casing to support Linux production environments
  const candidates = ['README.md', 'readme.md', 'Readme.md', 'README.txt', 'readme.txt'];
  
  for (const candidate of candidates) {
    const readmePath = path.join(fullDir, candidate);
    if (fs.existsSync(readmePath)) {
      return fs.readFileSync(readmePath, 'utf-8');
    }
  }
  
  return undefined;
}

export function getAlbumDir(albumPath: string): string {
  return path.join(ALBUMS_DIR, albumPath.replace(/^albums\//, ''));
}

export async function preWarmMetadataCache(): Promise<void> {
  loadDiskCache();

  const entries: string[] = [];

  // Portfolio images
  for (const file of listImageFiles(PORTFOLIO_DIR)) {
    entries.push(path.join(PORTFOLIO_DIR, file));
  }

  // Album images (recursively)
  if (fs.existsSync(ALBUMS_DIR)) {
    const walk = (dir: string) => {
      for (const item of fs.readdirSync(dir)) {
        if (isHiddenDir(item)) continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isFile() && IMAGE_EXTENSIONS.includes(path.extname(item).toLowerCase())) {
          entries.push(full);
        } else if (stat.isDirectory()) {
          walk(full);
        }
      }
    };
    walk(ALBUMS_DIR);
  }

  if (entries.length === 0) {
    console.log('[metadata] No images to cache');
    return;
  }

  // Count how many actually need parsing (not already cached with matching mtime)
  const pending = entries.filter(filePath => {
    try {
      const mtimeMs = fs.statSync(filePath).mtimeMs;
      const cached = metadataCache.get(filePath);
      return !cached || cached.mtimeMs !== mtimeMs;
    } catch {
      return true;
    }
  });

  if (pending.length === 0) {
    console.log(`[metadata] All ${entries.length} images already cached`);
    return;
  }

  console.log(`[metadata] Caching ${pending.length} new images (${entries.length} total)...`);

  let completed = 0;
  let failed = 0;

  for (const filePath of pending) {
    try {
      await getImageMetadata(filePath);
      completed++;
    } catch {
      failed++;
    }
    const done = completed + failed;
    if (done % 50 === 0 || done === pending.length) {
      console.log(`[metadata] Progress: ${done}/${pending.length}`);
    }
  }

  console.log(`[metadata] Done: ${completed} cached, ${failed} failed`);
  saveDiskCache();
}
