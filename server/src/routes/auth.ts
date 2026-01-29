import { Router } from 'express';
import { getAlbumPassword, isAlbumUnlocked, unlockAlbum } from '../services/password';

const router = Router();

// POST /api/auth/check
router.post('/check', (req, res) => {
  const { albumPath } = req.body;

  if (!albumPath) {
    res.status(400).json({ error: 'albumPath required' });
    return;
  }

  const password = getAlbumPassword(albumPath);
  res.json({
    hasPassword: !!password,
    isUnlocked: isAlbumUnlocked(req.session, albumPath),
  });
});

// POST /api/auth/unlock
router.post('/unlock', (req, res) => {
  const { albumPath, password } = req.body;

  if (!albumPath || !password) {
    res.status(400).json({ error: 'albumPath and password required' });
    return;
  }

  const correctPassword = getAlbumPassword(albumPath);

  if (!correctPassword) {
    res.json({ success: true, message: 'Album has no password' });
    return;
  }

  if (password === correctPassword) {
    unlockAlbum(req.session, albumPath);
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect password' });
  }
});

export default router;
