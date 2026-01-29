import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { IMAGE_EXTENSIONS, PORTFOLIO_DIR, ALBUMS_DIR } from '../config';
import { ImageInfo, AlbumInfo, GroupInfo, AlbumTree } from '../types';

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

function formatAlbumName(dirname: string): string {
  return dirname.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(filePath).metadata();
  return { width: metadata.width || 0, height: metadata.height || 0 };
}

function listImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => isImageFile(f) && !f.startsWith('.'))
    .sort();
}

export async function scanPortfolio(): Promise<ImageInfo[]> {
  const files = listImageFiles(PORTFOLIO_DIR);
  const images: ImageInfo[] = [];

  for (const filename of files) {
    const filePath = path.join(PORTFOLIO_DIR, filename);
    const { width, height } = await getImageDimensions(filePath);
    images.push({
      filename,
      path: `portfolio/${filename}`,
      width,
      height,
      thumbnailUrl: `/api/images/thumbnail/portfolio/${filename}`,
      fullUrl: `/api/images/full/portfolio/${filename}`,
      downloadUrl: `/api/images/download/portfolio/${filename}`,
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
    return fs.statSync(full).isDirectory() && !f.startsWith('.');
  });
}

function buildAlbumInfo(albumDir: string, albumPath: string): AlbumInfo {
  const name = path.basename(albumDir);
  const images = listImageFiles(albumDir);
  const hasPassword = fs.existsSync(path.join(albumDir, 'password.txt'));

  return {
    name: formatAlbumName(name),
    slug: name,
    path: albumPath,
    coverImage: images.length > 0
      ? `/api/images/thumbnail/${albumPath}/${images[0]}`
      : null,
    imageCount: images.length,
    hasPassword,
  };
}

export function scanAlbums(): AlbumTree {
  if (!fs.existsSync(ALBUMS_DIR)) {
    return { groups: [], albums: [] };
  }

  const entries = fs.readdirSync(ALBUMS_DIR).filter(f => {
    const full = path.join(ALBUMS_DIR, f);
    return fs.statSync(full).isDirectory() && !f.startsWith('.');
  }).sort();

  const groups: GroupInfo[] = [];
  const topAlbums: AlbumInfo[] = [];

  for (const entry of entries) {
    const entryDir = path.join(ALBUMS_DIR, entry);
    const albumPath = `albums/${entry}`;

    if (hasDirectImages(entryDir)) {
      // It's a top-level album
      topAlbums.push(buildAlbumInfo(entryDir, albumPath));
    } else if (hasSubdirectories(entryDir)) {
      // It's a group
      const subEntries = fs.readdirSync(entryDir).filter(f => {
        const full = path.join(entryDir, f);
        return fs.statSync(full).isDirectory() && !f.startsWith('.');
      }).sort();

      const groupAlbums = subEntries
        .filter(sub => hasDirectImages(path.join(entryDir, sub)))
        .map(sub => buildAlbumInfo(
          path.join(entryDir, sub),
          `albums/${entry}/${sub}`
        ));

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
    const { width, height } = await getImageDimensions(filePath);
    const imgPath = `${albumPath}/${filename}`;
    images.push({
      filename,
      path: imgPath,
      width,
      height,
      thumbnailUrl: `/api/images/thumbnail/${imgPath}`,
      fullUrl: `/api/images/full/${imgPath}`,
      downloadUrl: `/api/images/download/${imgPath}`,
    });
  }

  return images;
}

export function getAlbumReadme(albumPath: string): string | undefined {
  const fullDir = path.join(ALBUMS_DIR, albumPath.replace(/^albums\//, ''));
  const readmePath = path.join(fullDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    return fs.readFileSync(readmePath, 'utf-8');
  }
  return undefined;
}

export function getAlbumDir(albumPath: string): string {
  return path.join(ALBUMS_DIR, albumPath.replace(/^albums\//, ''));
}
