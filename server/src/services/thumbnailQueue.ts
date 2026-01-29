import fs from 'fs';
import path from 'path';
import { PORTFOLIO_DIR, ALBUMS_DIR, IMAGE_EXTENSIONS, THUMBNAILS_DIR } from '../config';
import { listImageFiles } from './scanner';
import { ensureThumbnail } from './thumbnail';

interface ImageEntry {
  absolutePath: string;
  relativePath: string;
}

function collectAllImages(): ImageEntry[] {
  const entries: ImageEntry[] = [];

  // Portfolio images
  for (const file of listImageFiles(PORTFOLIO_DIR)) {
    entries.push({
      absolutePath: path.join(PORTFOLIO_DIR, file),
      relativePath: `portfolio/${file}`,
    });
  }

  // Album images (recursively)
  if (fs.existsSync(ALBUMS_DIR)) {
    const walkAlbums = (dir: string, relativeBase: string) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);

      // Add image files in this directory
      for (const item of items) {
        if (item.startsWith('.')) continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isFile() && IMAGE_EXTENSIONS.includes(path.extname(item).toLowerCase())) {
          entries.push({
            absolutePath: full,
            relativePath: `${relativeBase}/${item}`,
          });
        } else if (stat.isDirectory()) {
          walkAlbums(full, `${relativeBase}/${item}`);
        }
      }
    };
    walkAlbums(ALBUMS_DIR, 'albums');
  }

  return entries;
}

function needsThumbnail(entry: ImageEntry): boolean {
  const parsed = path.parse(entry.relativePath);
  const thumbPath = path.join(THUMBNAILS_DIR, parsed.dir, `${parsed.name}.jpg`);

  if (!fs.existsSync(thumbPath)) return true;

  const srcStat = fs.statSync(entry.absolutePath);
  const thumbStat = fs.statSync(thumbPath);
  return thumbStat.mtimeMs < srcStat.mtimeMs;
}

export async function preGenerateThumbnails(): Promise<void> {
  const allImages = collectAllImages();
  const pending = allImages.filter(needsThumbnail);

  if (pending.length === 0) {
    console.log(`[thumbnails] All ${allImages.length} thumbnails are up to date`);
    return;
  }

  console.log(`[thumbnails] Generating ${pending.length} thumbnails (${allImages.length} total images)...`);

  const concurrency = 5;
  let completed = 0;
  let failed = 0;

  const processEntry = async (entry: ImageEntry) => {
    try {
      await ensureThumbnail(entry.absolutePath, entry.relativePath);
      completed++;
    } catch (err) {
      failed++;
      console.error(`[thumbnails] Failed: ${entry.relativePath}`, err);
    }
    const done = completed + failed;
    if (done % 25 === 0 || done === pending.length) {
      console.log(`[thumbnails] Progress: ${done}/${pending.length}`);
    }
  };

  // Process with limited concurrency
  const queue = [...pending];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const entry = queue.shift()!;
      await processEntry(entry);
    }
  });

  await Promise.all(workers);

  console.log(`[thumbnails] Done: ${completed} generated, ${failed} failed`);
}
