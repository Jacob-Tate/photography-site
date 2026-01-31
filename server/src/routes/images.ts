import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { ensureThumbnail } from '../services/thumbnail';

const router = Router();

function validatePath(reqPath: string): string | null {
  const resolved = path.resolve(config.photosDir, reqPath);
  if (!resolved.startsWith(config.photosDir)) {
    console.error(`Path validation failed: ${resolved} doesn't start with ${config.photosDir}`);
    return null;
  }
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    return null;
  }
  return resolved;
}

// GET /api/images/thumbnail/*
router.get('/thumbnail/*', async (req, res) => {
  try {
    const relativePath = (req.params as unknown as Record<string, string>)[0];
    const absPath = validatePath(relativePath);

    if (!absPath) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const thumbPath = await ensureThumbnail(absPath, relativePath);
    res.set('Cache-Control', 'no-cache');
    res.sendFile(thumbPath);
  } catch (err) {
    console.error('Thumbnail error:', err);
    res.status(500).json({ error: 'Failed to generate thumbnail' });
  }
});

// GET /api/images/full/*
router.get('/full/*', (req, res) => {
  const relativePath = (req.params as unknown as Record<string, string>)[0];
  const absPath = validatePath(relativePath);

  if (!absPath) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  res.set('Cache-Control', 'no-cache');
  res.sendFile(absPath);
});

// GET /api/images/download/*
router.get('/download/*', (req, res) => {
  const relativePath = (req.params as unknown as Record<string, string>)[0];
  const absPath = validatePath(relativePath);

  if (!absPath) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  const filename = path.basename(absPath);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(absPath);
});

export default router;
