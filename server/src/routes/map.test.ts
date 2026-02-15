import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

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
