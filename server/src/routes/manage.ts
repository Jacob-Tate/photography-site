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

export default router;
