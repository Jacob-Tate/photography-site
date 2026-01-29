import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { config, THUMBNAILS_DIR } from '../config';

function getThumbnailPath(imagePath: string): string {
  const parsed = path.parse(imagePath);
  return path.join(THUMBNAILS_DIR, parsed.dir, `${parsed.name}.jpg`);
}

export async function ensureThumbnail(sourceAbsPath: string, relativePath: string): Promise<string> {
  const thumbPath = getThumbnailPath(relativePath);

  if (fs.existsSync(thumbPath)) {
    const srcStat = fs.statSync(sourceAbsPath);
    const thumbStat = fs.statSync(thumbPath);
    if (thumbStat.mtimeMs >= srcStat.mtimeMs) {
      return thumbPath;
    }
  }

  const thumbDir = path.dirname(thumbPath);
  fs.mkdirSync(thumbDir, { recursive: true });

  await sharp(sourceAbsPath)
    .resize({ width: config.thumbnailMaxWidth, withoutEnlargement: true })
    .jpeg({ quality: config.thumbnailQuality })
    .toFile(thumbPath);

  return thumbPath;
}
