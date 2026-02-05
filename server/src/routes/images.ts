import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { ensureThumbnail } from '../services/thumbnail';
import { ensureSocialExport, getPresetById, SOCIAL_PRESETS } from '../services/socialExport';
import { recordPhotoView, recordIP } from '../services/analytics';

const router = Router();

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

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
    const ext = path.extname(relativePath).toLowerCase();
    if (MIME_TYPES[ext]) {
      res.set('Content-Type', MIME_TYPES[ext]);
    }
    res.set('Cache-Control', 'public, max-age=86400');
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

  recordPhotoView(relativePath);
  if (req.ip) recordIP(req.ip);

  const ext = path.extname(absPath).toLowerCase();
  if (MIME_TYPES[ext]) {
    res.set('Content-Type', MIME_TYPES[ext]);
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

// GET /api/images/social/:preset/*
router.get('/social/:preset/*', async (req, res) => {
  try {
    const presetId = req.params.preset;
    const relativePath = (req.params as unknown as Record<string, string>)[0];

    const preset = getPresetById(presetId);
    if (!preset) {
      res.status(400).json({ error: 'Invalid preset', validPresets: SOCIAL_PRESETS.map(p => p.id) });
      return;
    }

    const absPath = validatePath(relativePath);
    if (!absPath) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const exportPath = await ensureSocialExport(absPath, relativePath, preset);

    // Build descriptive filename: originalname-platform-preset.ext
    const originalName = path.parse(relativePath).name;
    const ext = preset.format === 'png' ? 'png' : 'jpg';
    const downloadFilename = `${originalName}-${preset.platform.toLowerCase().replace('/', '-')}-${preset.name.toLowerCase()}.${ext}`;

    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', preset.format === 'png' ? 'image/png' : 'image/jpeg');
    res.sendFile(exportPath);
  } catch (err) {
    console.error('Social export error:', err);
    res.status(500).json({ error: 'Failed to generate social export' });
  }
});

export default router;
