import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/timeline', { timeout: 30000 }, () => {
  it('returns 200 with images array of length <= 5', async () => {
    const res = await request(app).get('/api/timeline?page=1&limit=5');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.images)).toBe(true);
    expect(res.body.images.length).toBeGreaterThan(0);
    expect(res.body.images.length).toBeLessThanOrEqual(5);
  });

  it('response has total count > 0 and hasMore boolean', async () => {
    const res = await request(app).get('/api/timeline?page=1&limit=5');

    expect(res.body.total).toBeGreaterThan(0);
    expect(typeof res.body.hasMore).toBe('boolean');
  });

  it('images are sorted by date descending', async () => {
    const res = await request(app).get('/api/timeline?page=1&limit=5');

    const images = res.body.images as {
      exif?: { dateTaken?: string };
    }[];

    // Find first two images that both have dateTaken
    const dated = images.filter((img) => img.exif?.dateTaken);
    expect(dated.length).toBeGreaterThanOrEqual(2);

    const first = new Date(
      dated[0].exif!.dateTaken!.replace(' at ', ' ')
    ).getTime();
    const second = new Date(
      dated[1].exif!.dateTaken!.replace(' at ', ' ')
    ).getTime();

    expect(first).toBeGreaterThanOrEqual(second);
  });
});
