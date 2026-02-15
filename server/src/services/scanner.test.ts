import { describe, it, expect } from 'vitest';
import { isHiddenDir, formatAlbumName, gcd, formatAspectRatio, albumSort } from './scanner';

describe('isHiddenDir', () => {
  it('returns true for dot-prefixed dirs', () => {
    expect(isHiddenDir('.thumbnails')).toBe(true);
    expect(isHiddenDir('.metadata-cache.json')).toBe(true);
  });

  it('returns true for Synology eaDir', () => {
    expect(isHiddenDir('@eadir')).toBe(true);
    expect(isHiddenDir('@eaDir')).toBe(true);
  });

  it('returns false for regular dirs', () => {
    expect(isHiddenDir('vacation')).toBe(false);
    expect(isHiddenDir('2024-trip')).toBe(false);
  });
});

describe('formatAlbumName', () => {
  it('replaces hyphens and underscores with spaces and capitalizes', () => {
    expect(formatAlbumName('my-cool-album')).toBe('My Cool Album');
    expect(formatAlbumName('my_cool_album')).toBe('My Cool Album');
  });

  it('capitalizes single word', () => {
    expect(formatAlbumName('vacation')).toBe('Vacation');
  });

  it('handles mixed separators', () => {
    expect(formatAlbumName('summer-trip_2024')).toBe('Summer Trip 2024');
  });
});

describe('gcd', () => {
  it('computes greatest common divisor', () => {
    expect(gcd(6000, 4000)).toBe(2000);
    expect(gcd(1920, 1080)).toBe(120);
    expect(gcd(1, 1)).toBe(1);
  });

  it('handles one value being zero', () => {
    expect(gcd(5, 0)).toBe(5);
  });
});

describe('formatAspectRatio', () => {
  it('returns 3:2 for standard photo ratio', () => {
    expect(formatAspectRatio(6000, 4000)).toBe('3:2');
  });

  it('returns 16:9 for widescreen', () => {
    expect(formatAspectRatio(1920, 1080)).toBe('16:9');
  });

  it('returns 4:3 for standard', () => {
    expect(formatAspectRatio(4000, 3000)).toBe('4:3');
  });

  it('returns 1:1 for square', () => {
    expect(formatAspectRatio(1000, 1000)).toBe('1:1');
  });

  it('approximates complex ratios to common ones', () => {
    // 4928x3264 is close to 3:2 (1.509...)
    expect(formatAspectRatio(4928, 3264)).toBe('3:2');
  });
});

describe('albumSort', () => {
  it('sorts date-prefixed names newest first', () => {
    const items = ['20230101-trip', '20240601-vacation', '20231215-holiday'];
    const sorted = [...items].sort(albumSort);
    expect(sorted).toEqual(['20240601-vacation', '20231215-holiday', '20230101-trip']);
  });

  it('sorts non-date names alphabetically', () => {
    const items = ['zebra', 'alpha', 'middle'];
    const sorted = [...items].sort(albumSort);
    expect(sorted).toEqual(['alpha', 'middle', 'zebra']);
  });

  it('handles mix of date and non-date names', () => {
    const items = ['zoo', '20240101-new-year', 'apple'];
    const sorted = [...items].sort(albumSort);
    // Date items sort relative to non-date by localeCompare
    expect(sorted[0]).toBe('20240101-new-year');
  });
});
