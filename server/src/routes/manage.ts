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

export default router;
