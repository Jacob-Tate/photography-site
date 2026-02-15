import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { getAlbumPassword, isAlbumUnlocked, unlockAlbum } from './password';

vi.mock('fs');
vi.mock('../config', () => ({
  ALBUMS_DIR: '/photos/albums',
}));

const mockFs = vi.mocked(fs);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAlbumPassword', () => {
  it('returns null when password.txt does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getAlbumPassword('albums/vacation')).toBeNull();
  });

  it('returns trimmed password from password.txt', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('  secret123  \n');
    expect(getAlbumPassword('albums/vacation')).toBe('secret123');
  });

  it('strips albums/ prefix from path', () => {
    mockFs.existsSync.mockReturnValue(false);
    getAlbumPassword('albums/my-trip');
    expect(mockFs.existsSync).toHaveBeenCalledWith(
      expect.stringContaining('my-trip/password.txt')
    );
  });
});

describe('isAlbumUnlocked', () => {
  it('returns true when album has no password', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(isAlbumUnlocked({}, 'albums/public')).toBe(true);
  });

  it('returns false when album is locked and session has no unlocked albums', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('pass');
    expect(isAlbumUnlocked({}, 'albums/private')).toBe(false);
  });

  it('returns true when album is in session unlockedAlbums', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('pass');
    const session = { unlockedAlbums: ['albums/private'] };
    expect(isAlbumUnlocked(session, 'albums/private')).toBe(true);
  });
});

describe('unlockAlbum', () => {
  it('creates unlockedAlbums array if missing', () => {
    const session: { unlockedAlbums?: string[] } = {};
    unlockAlbum(session, 'albums/trip');
    expect(session.unlockedAlbums).toEqual(['albums/trip']);
  });

  it('does not add duplicate entries', () => {
    const session = { unlockedAlbums: ['albums/trip'] };
    unlockAlbum(session, 'albums/trip');
    expect(session.unlockedAlbums).toEqual(['albums/trip']);
  });

  it('appends new album to existing list', () => {
    const session = { unlockedAlbums: ['albums/a'] };
    unlockAlbum(session, 'albums/b');
    expect(session.unlockedAlbums).toEqual(['albums/a', 'albums/b']);
  });
});
