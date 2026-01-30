import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { Response } from 'express';
import { IMAGE_EXTENSIONS } from '../config';
import { isHiddenDir } from './scanner';

export function streamAlbumZip(albumDir: string, albumName: string, res: Response): void {
  const archive = archiver('zip', { zlib: { level: 5 } });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${albumName}.zip"`);

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create archive' });
    }
  });

  archive.pipe(res);

  const files = fs.readdirSync(albumDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) && !isHiddenDir(f);
  });

  for (const file of files) {
    archive.file(path.join(albumDir, file), { name: file });
  }

  archive.finalize();
}
