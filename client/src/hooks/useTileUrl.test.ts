import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const KEYED_URL = 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=test';

// The hook caches the URL at module level, so load a fresh module per test.
async function loadHook() {
  vi.resetModules();
  return import('./useTileUrl');
}

describe('useTileUrl', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null while loading, then the URL from /api/map/tiles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: KEYED_URL }) });
    vi.stubGlobal('fetch', fetchMock);
    const { useTileUrl } = await loadHook();

    const { result } = renderHook(() => useTileUrl());

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(KEYED_URL));
    expect(fetchMock).toHaveBeenCalledWith('/api/map/tiles');
  });

  it('fetches only once when several maps mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ url: KEYED_URL }) });
    vi.stubGlobal('fetch', fetchMock);
    const { useTileUrl } = await loadHook();

    const a = renderHook(() => useTileUrl());
    const b = renderHook(() => useTileUrl());

    await waitFor(() => expect(a.result.current).toBe(KEYED_URL));
    await waitFor(() => expect(b.result.current).toBe(KEYED_URL));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to the keyless URL and logs when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { useTileUrl, FALLBACK_TILE_URL } = await loadHook();

    const { result } = renderHook(() => useTileUrl());

    await waitFor(() => expect(result.current).toBe(FALLBACK_TILE_URL));
    expect(console.error).toHaveBeenCalled();
  });
});
