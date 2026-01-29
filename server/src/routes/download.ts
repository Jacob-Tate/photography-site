import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { ALBUMS_DIR } from '../config';
import { isAlbumUnlocked } from '../services/password';
import { streamAlbumZip } from '../services/zipper';

const router = Router();

// GET /api/download/album/*
router.get('/album/*', (req, res) => {
  try {
    const albumRelPath = (req.params as unknown as Record<string, string>)[0];
    const resolved = path.resolve(ALBUMS_DIR, albumRelPath);

    if (!resolved.startsWith(ALBUMS_DIR)) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      res.status(404).json({ error: 'Album not found' });
      return;
    }

    const albumPath = 'albums/' + albumRelPath;
    if (!isAlbumUnlocked(req.session, albumPath)) {
      res.status(403).json({ error: 'Album is password-protected', needsPassword: true });
      return;
    }

    const albumName = path.basename(resolved);
    streamAlbumZip(resolved, albumName, res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to create download' });
  }
});

export default router;
