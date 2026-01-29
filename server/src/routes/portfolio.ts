import { Router } from 'express';
import { scanPortfolio } from '../services/scanner';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const images = await scanPortfolio();
    res.json({ images });
  } catch (err) {
    console.error('Error scanning portfolio:', err);
    res.status(500).json({ error: 'Failed to scan portfolio' });
  }
});

export default router;
