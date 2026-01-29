import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      // Priority: Query String > Headers > Body > Default
      const queryDest = req.query.destination as string;
      const headerDest = req.headers['x-destination'] as string;
      const bodyDest = req.body.destination as string;
      
      // Log what we received to help debug
      console.log('Upload Request Debug:', { 
        query: queryDest, 
        header: headerDest, 
        body: bodyDest 
      });
      
      const destination = queryDest || headerDest || bodyDest || 'portfolio';
      const resolved = path.resolve(config.photosDir, destination);

      if (!resolved.startsWith(config.photosDir)) {
        cb(new Error('Invalid destination'), '');
        return;
      }

      fs.mkdirSync(resolved, { recursive: true });
      cb(null, resolved);
    },
    filename: (_req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const router = Router();

router.post('/', apiKeyAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  // Determine final destination for the response
  const finalDest = (req.query.destination as string) || 
                    (req.headers['x-destination'] as string) || 
                    req.body.destination || 
                    'portfolio';

  res.json({
    success: true,
    filename: req.file.originalname,
    destination: finalDest,
    size: req.file.size,
  });
});

export default router;
