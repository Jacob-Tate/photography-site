import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { apiKeyAuth } from '../middleware/apiKeyAuth';
import { THUMBNAILS_DIR } from '../config';

const router = Router();

// POST /api/manage/delete
router.post('/delete', apiKeyAuth, (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ error: 'filePath is required' });
    return;
  }

  const resolvedPath = path.resolve(config.photosDir, filePath);
  
  if (!resolvedPath.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  try {
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    } else {
      console.warn(`File to delete not found: ${resolvedPath}`);
    }

    const parsed = path.parse(filePath);
    const thumbPath = path.join(THUMBNAILS_DIR, parsed.dir, `${parsed.name}.jpg`);
    
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
      try {
        const thumbDir = path.dirname(thumbPath);
        if (fs.readdirSync(thumbDir).length === 0) {
          fs.rmdirSync(thumbDir);
        }
      } catch (e) {}
    }

    try {
      const parentDir = path.dirname(resolvedPath);
      if (fs.readdirSync(parentDir).length === 0) {
        fs.rmdirSync(parentDir);
      }
    } catch (e) {}

    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// POST /api/manage/password
router.post('/password', apiKeyAuth, (req, res) => {
  const { albumPath, password } = req.body;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const passwordFile = path.join(resolvedDir, 'password.txt');

  try {
    if (password && password.trim() !== '') {
      fs.mkdirSync(resolvedDir, { recursive: true });
      fs.writeFileSync(passwordFile, password.trim(), 'utf-8');
    } else {
      if (fs.existsSync(passwordFile)) {
        fs.unlinkSync(passwordFile);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// POST /api/manage/cover
router.post('/cover', apiKeyAuth, (req, res) => {
  const { albumPath, filename } = req.body;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const coverFile = path.join(resolvedDir, 'cover.txt');

  try {
    if (filename && filename.trim() !== '') {
      fs.mkdirSync(resolvedDir, { recursive: true });
      fs.writeFileSync(coverFile, filename.trim(), 'utf-8');
    } else {
      if (fs.existsSync(coverFile)) {
        fs.unlinkSync(coverFile);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Cover update error:', err);
    res.status(500).json({ error: 'Failed to update cover image' });
  }
});

// POST /api/manage/ignorestats
router.post('/ignorestats', apiKeyAuth, (req, res) => {
  const { albumPath, ignored } = req.body;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const ignoreFile = path.join(resolvedDir, 'ignorestats.txt');

  try {
    if (ignored) {
      fs.mkdirSync(resolvedDir, { recursive: true });
      fs.writeFileSync(ignoreFile, '', 'utf-8');
    } else {
      if (fs.existsSync(ignoreFile)) {
        fs.unlinkSync(ignoreFile);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Ignore stats update error:', err);
    res.status(500).json({ error: 'Failed to update ignore stats' });
  }
});

// GET /api/manage/ignorestats
router.get('/ignorestats', apiKeyAuth, (req, res) => {
  const albumPath = req.query.albumPath as string;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const ignoreFile = path.join(resolvedDir, 'ignorestats.txt');
  res.json({ ignored: fs.existsSync(ignoreFile) });
});

// Find existing readme file with any common casing, or default to README.md
const README_CANDIDATES = ['README.md', 'readme.md', 'Readme.md'];

function findReadmeFile(dir: string): string {
  for (const name of README_CANDIDATES) {
    const filePath = path.join(dir, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return path.join(dir, 'README.md');
}

// GET /api/manage/readme
router.get('/readme', apiKeyAuth, (req, res) => {
  const albumPath = req.query.albumPath as string;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const readmeFile = findReadmeFile(resolvedDir);

  try {
    if (fs.existsSync(readmeFile)) {
      const content = fs.readFileSync(readmeFile, 'utf-8');
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (err) {
    console.error('Read readme error:', err);
    res.status(500).json({ error: 'Failed to read README' });
  }
});

// POST /api/manage/readme
router.post('/readme', apiKeyAuth, (req, res) => {
  const { albumPath, content } = req.body;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const readmeFile = findReadmeFile(resolvedDir);

  try {
    if (content && content.trim() !== '') {
      fs.mkdirSync(resolvedDir, { recursive: true });
      fs.writeFileSync(readmeFile, content, 'utf-8');
    } else {
      if (fs.existsSync(readmeFile)) {
        fs.unlinkSync(readmeFile);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Write readme error:', err);
    res.status(500).json({ error: 'Failed to write README' });
  }
});

// GET /api/manage/caption
router.get('/caption', apiKeyAuth, (req, res) => {
  const imagePath = req.query.imagePath as string;

  if (!imagePath) {
    res.status(400).json({ error: 'imagePath is required' });
    return;
  }

  const resolvedPath = path.resolve(config.photosDir, imagePath);

  if (!resolvedPath.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const parsed = path.parse(resolvedPath);
  const captionFile = path.join(parsed.dir, parsed.name + '.md');

  try {
    if (fs.existsSync(captionFile)) {
      const content = fs.readFileSync(captionFile, 'utf-8');
      res.json({ content });
    } else {
      res.json({ content: '' });
    }
  } catch (err) {
    console.error('Read caption error:', err);
    res.status(500).json({ error: 'Failed to read caption' });
  }
});

// POST /api/manage/caption
router.post('/caption', apiKeyAuth, (req, res) => {
  const { imagePath, content } = req.body;

  if (!imagePath) {
    res.status(400).json({ error: 'imagePath is required' });
    return;
  }

  const resolvedPath = path.resolve(config.photosDir, imagePath);

  if (!resolvedPath.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const parsed = path.parse(resolvedPath);
  const captionFile = path.join(parsed.dir, parsed.name + '.md');

  try {
    if (content && content.trim() !== '') {
      fs.mkdirSync(parsed.dir, { recursive: true });
      fs.writeFileSync(captionFile, content, 'utf-8');
    } else {
      if (fs.existsSync(captionFile)) {
        fs.unlinkSync(captionFile);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Write caption error:', err);
    res.status(500).json({ error: 'Failed to write caption' });
  }
});

/**
 * Trip Days Feature
 *
 * When an album has a `trip_days.txt` file in its directory, the album is displayed
 * with photos grouped by day based on their EXIF dateTaken field.
 *
 * The trip_days.txt file acts as a flag - its presence enables the feature.
 * The file can optionally contain configuration in the future, but currently
 * just needs to exist.
 *
 * In the UI:
 * - Album page shows photos grouped with "Day 1: (date)", "Day 2: (date)" headers
 * - Map trail view shows separate routes per day with checkboxes to filter
 *
 * This can only be toggled via:
 * - Lightroom plugin (API key required)
 * - Manually creating/deleting trip_days.txt in the album folder
 */

// POST /api/manage/tripdays - Toggle trip days mode (API key required)
router.post('/tripdays', apiKeyAuth, (req, res) => {
  const { albumPath } = req.body;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    res.status(404).json({ error: 'Album not found' });
    return;
  }

  const tripDaysFile = path.join(resolvedDir, 'trip_days.txt');

  try {
    if (fs.existsSync(tripDaysFile)) {
      // Remove the file to disable trip days
      fs.unlinkSync(tripDaysFile);
      res.json({ tripDays: false });
    } else {
      // Create the file to enable trip days
      fs.writeFileSync(tripDaysFile, '# Trip Days Mode\n# This file enables day-by-day grouping for this album.\n# Photos are grouped by their EXIF date taken.\n');
      res.json({ tripDays: true });
    }
  } catch (err) {
    console.error('Trip days toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle trip days' });
  }
});

// GET /api/manage/tripdays - Get trip days status (API key required)
router.get('/tripdays', apiKeyAuth, (req, res) => {
  const albumPath = req.query.albumPath as string;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath is required' });
    return;
  }

  const resolvedDir = path.resolve(config.photosDir, albumPath);

  if (!resolvedDir.startsWith(config.photosDir)) {
    res.status(403).json({ error: 'Invalid path' });
    return;
  }

  const tripDaysFile = path.join(resolvedDir, 'trip_days.txt');
  res.json({ tripDays: fs.existsSync(tripDaysFile) });
});

export default router;
