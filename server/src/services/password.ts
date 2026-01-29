import fs from 'fs';
import path from 'path';
import { ALBUMS_DIR } from '../config';

export function getAlbumPassword(albumRelPath: string): string | null {
  const albumDir = path.join(ALBUMS_DIR, albumRelPath.replace(/^albums\//, ''));
  const passwordFile = path.join(albumDir, 'password.txt');

  if (!fs.existsSync(passwordFile)) return null;

  return fs.readFileSync(passwordFile, 'utf-8').trim();
}

export function isAlbumUnlocked(session: { unlockedAlbums?: string[] }, albumPath: string): boolean {
  const password = getAlbumPassword(albumPath);
  if (!password) return true;
  return session.unlockedAlbums?.includes(albumPath) ?? false;
}

export function unlockAlbum(session: { unlockedAlbums?: string[] }, albumPath: string): void {
  if (!session.unlockedAlbums) {
    session.unlockedAlbums = [];
  }
  if (!session.unlockedAlbums.includes(albumPath)) {
    session.unlockedAlbums.push(albumPath);
  }
}
