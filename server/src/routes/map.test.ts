import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { buildTileUrl } from './map';

describe('GET /api/map', { timeout: 30000 }, () => {
  it('returns 200 with images array', async () => {
    const res = await request(app).get('/api/map');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('images');
    expect(Array.isArray(res.body.images)).toBe(true);
  });

  it('all returned images have exif.gps with latitude and longitude', async () => {
    const res = await request(app).get('/api/map');

    expect(res.body.images.length).toBeGreaterThan(0);
    for (const img of res.body.images) {
      expect(img.exif).toHaveProperty('gps');
      expect(img.exif.gps).toHaveProperty('latitude');
      expect(img.exif.gps).toHaveProperty('longitude');
    }
  });

  it('includes at least one image from test-gps album', async () => {
    const res = await request(app).get('/api/map');

    const testGpsImages = res.body.images.filter(
      (img: { albumPath: string }) => img.albumPath?.includes('test-gps')
    );
    expect(testGpsImages.length).toBeGreaterThan(0);
  });

  it('excludes images from test-ignorestats album', async () => {
    const res = await request(app).get('/api/map');

    const ignoredImages = res.body.images.filter(
      (img: { albumPath: string }) => img.albumPath?.includes('test-ignorestats')
    );
    expect(ignoredImages.length).toBe(0);
  });
});

describe('GET /api/map/tiles', () => {
  it('returns a CARTO dark tile URL template with Leaflet placeholders', async () => {
    const res = await request(app).get('/api/map/tiles');

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^https:\/\/basemaps\.cartocdn\.com\/rastertiles\/dark_all\//);
    expect(res.body.url).toContain('{z}/{x}/{y}{r}.png');
  });
});

describe('buildTileUrl', () => {
  it('appends the key as a query parameter when set', () => {
    expect(buildTileUrl('abc123')).toBe(
      'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=abc123'
    );
  });

  it('URL-encodes the key', () => {
    expect(buildTileUrl('a b&c')).toMatch(/\?key=a%20b%26c$/);
  });

  it('strips surrounding quotes and whitespace from the key', () => {
    const expected = 'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=abc123';
    expect(buildTileUrl('"abc123"')).toBe(expected);
    expect(buildTileUrl("'abc123'")).toBe(expected);
    expect(buildTileUrl('  abc123 \n')).toBe(expected);
  });

  it('treats a key of only quotes as unset', () => {
    expect(buildTileUrl('""')).not.toContain('?key=');
  });

  it('omits the key parameter when no key is configured', () => {
    expect(buildTileUrl('')).not.toContain('?key=');
  });
});
