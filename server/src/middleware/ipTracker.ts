import { Request, Response, NextFunction } from 'express';
import { recordIP } from '../services/analytics';

export function ipTracker(req: Request, _res: Response, next: NextFunction): void {
  if (req.ip) {
    recordIP(req.ip);
  }
  next();
}
