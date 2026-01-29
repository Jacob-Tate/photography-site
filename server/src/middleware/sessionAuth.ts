import { Request, Response, NextFunction } from 'express';
import { isAlbumUnlocked } from '../services/password';

export function sessionAuth(extractAlbumPath: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const albumPath = extractAlbumPath(req);

    if (isAlbumUnlocked(req.session, albumPath)) {
      next();
    } else {
      res.status(403).json({ error: 'Album is password-protected', needsPassword: true });
    }
  };
}
