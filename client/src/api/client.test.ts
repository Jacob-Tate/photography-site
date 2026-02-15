import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPortfolio, unlockAlbum, fetchAlbumTree } from './client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchPortfolio', () => {
  it('fetches from /api/portfolio and returns parsed JSON', async () => {
    const data = { images: [{ filename: 'test.jpg' }] };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

    const result = await fetchPortfolio();
    expect(mockFetch).toHaveBeenCalledWith('/api/portfolio');
    expect(result).toEqual(data);
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchPortfolio()).rejects.toThrow('Failed to fetch portfolio');
  });
});

describe('unlockAlbum', () => {
  it('posts to /api/auth/unlock with correct body', async () => {
    const data = { success: true };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

    const result = await unlockAlbum('albums/private', 'secret');
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumPath: 'albums/private', password: 'secret' }),
    });
    expect(result).toEqual({ success: true });
  });

  it('returns error payload on failed unlock', async () => {
    const data = { success: false, error: 'Incorrect password' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

    const result = await unlockAlbum('albums/private', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Incorrect password');
  });
});

describe('fetchAlbumTree', () => {
  it('fetches from /api/albums', async () => {
    const data = { groups: [], albums: [] };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });

    const result = await fetchAlbumTree();
    expect(mockFetch).toHaveBeenCalledWith('/api/albums');
    expect(result).toEqual(data);
  });

  it('throws on failure', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(fetchAlbumTree()).rejects.toThrow('Failed to fetch albums');
  });
});
