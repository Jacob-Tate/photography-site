import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { renderMarkdown } from '../services/markdown';
import { scanAlbums, scanAlbumImages, getAlbumReadme, getAlbumDir, isHiddenDir } from '../services/scanner';
import { getAlbumPassword, isAlbumUnlocked } from '../services/password';
import { ALBUMS_DIR, IMAGE_EXTENSIONS } from '../config';

const router = Router();

// GET /api/albums - album tree
router.get('/', (_req, res) => {
  try {
    const tree = scanAlbums();
    res.json(tree);
  } catch (err) {
    console.error('Error scanning albums:', err);
    res.status(500).json({ error: 'Failed to scan albums' });
  }
});

// GET /api/albums/* - group or album detail
router.get('/*', async (req, res) => {
  try {
    const pathStr = (req.params as unknown as Record<string, string>)[0];
    const albumPath = 'albums/' + pathStr;

    // Validate path traversal
    const resolved = path.resolve(ALBUMS_DIR, pathStr);
    if (!resolved.startsWith(ALBUMS_DIR)) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Check if this is a group (has subdirectories with images) or album (has images directly)
    const entries = fs.readdirSync(resolved);
    const hasImages = entries.some(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()));
    const hasSubDirs = entries.some(f => {
      const full = path.join(resolved, f);
      return fs.statSync(full).isDirectory() && !isHiddenDir(f);
    });

    if (hasImages) {
      // It's an album
      const password = getAlbumPassword(albumPath);
      if (password && !isAlbumUnlocked(req.session, albumPath)) {
        res.json({
          type: 'album',
          name: formatName(path.basename(resolved)),
          slug: path.basename(resolved),
          path: albumPath,
          hasPassword: true,
          needsPassword: true,
          imageCount: entries.filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())).length,
        });
        return;
      }

      const images = await scanAlbumImages(albumPath);
      const readme = getAlbumReadme(albumPath);

      res.json({
        type: 'album',
        name: formatName(path.basename(resolved)),
        slug: path.basename(resolved),
        path: albumPath,
        hasPassword: !!password,
        needsPassword: false,
        images,
        readme: readme ? await renderMarkdown(readme, albumPath) : undefined,
        imageCount: images.length,
      });
    } else if (hasSubDirs) {
      // It's a group
      const datePattern = /^\d{8}/;
      const subAlbums = entries
        .filter(f => {
          const full = path.join(resolved, f);
          return fs.statSync(full).isDirectory() && !isHiddenDir(f);
        })
        .sort((a, b) => datePattern.test(a) && datePattern.test(b) ? b.localeCompare(a) : a.localeCompare(b))
        .map(sub => {
          const subDir = path.join(resolved, sub);
          const subImages = fs.readdirSync(subDir).filter(f =>
            IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
          ).sort();
          const subPath = `${albumPath}/${sub}`;
          const subHasPassword = fs.existsSync(path.join(subDir, 'password.txt'));

          let coverFilename = subImages[0];
          const coverFile = path.join(subDir, 'cover.txt');
          if (fs.existsSync(coverFile)) {
            const coverName = fs.readFileSync(coverFile, 'utf-8').trim();
            if (coverName && subImages.includes(coverName)) {
              coverFilename = coverName;
            }
          }

          return {
            name: formatName(sub),
            slug: sub,
            path: subPath,
            coverImage: subImages.length > 0 && !subHasPassword && coverFilename
              ? `/api/images/thumbnail/${subPath}/${coverFilename}`
              : null,
            imageCount: subImages.length,
            hasPassword: subHasPassword,
          };
        });

      res.json({
        type: 'group',
        name: formatName(path.basename(resolved)),
        slug: path.basename(resolved),
        albums: subAlbums,
      });
    } else {
      res.status(404).json({ error: 'Empty directory' });
    }
  } catch (err) {
    console.error('Error reading album:', err);
    res.status(500).json({ error: 'Failed to read album' });
  }
});

function formatName(dirname: string): string {
  return dirname.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default router;
