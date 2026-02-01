import fs from 'fs';
import path from 'path';
import { ALBUMS_DIR, PORTFOLIO_DIR } from '../config';

/**
 * Check if an album has ignorestats.txt, meaning it should be excluded
 * from stats, map, search, and tags (but still browsable).
 */
export function isStatsIgnored(albumPath: string): boolean {
  const relative = albumPath.replace(/^albums\//, '');
  const dir = path.join(ALBUMS_DIR, relative);
  return fs.existsSync(path.join(dir, 'ignorestats.txt'));
}

/**
 * Check if the portfolio directory has ignorestats.txt.
 */
export function isPortfolioStatsIgnored(): boolean {
  return fs.existsSync(path.join(PORTFOLIO_DIR, 'ignorestats.txt'));
}
