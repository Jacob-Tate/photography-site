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

export default router;
