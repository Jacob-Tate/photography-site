import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/portfolio', () => {
  it('returns 200 with images array', async () => {
    const res = await request(app).get('/api/portfolio');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('images');
    expect(Array.isArray(res.body.images)).toBe(true);
    expect(res.body.images.length).toBeGreaterThan(0);
  });

  it('images have thumbnailUrl, fullUrl, and downloadUrl fields', async () => {
    const res = await request(app).get('/api/portfolio');

    for (const image of res.body.images) {
      expect(image).toHaveProperty('thumbnailUrl');
      expect(image).toHaveProperty('fullUrl');
      expect(image).toHaveProperty('downloadUrl');
      expect(image.thumbnailUrl).toContain('/api/images/thumbnail/');
      expect(image.fullUrl).toContain('/api/images/full/');
      expect(image.downloadUrl).toContain('/api/images/download/');
    }
  });

  it('portfolio caption file appears as caption on matching image', async () => {
    const res = await request(app).get('/api/portfolio');

    const captionedImage = res.body.images.find(
      (img: { filename: string }) => img.filename === 'DSCF7315.jpg'
    );
    expect(captionedImage).toBeDefined();
    expect(captionedImage.caption).toContain('A beautiful landscape shot');
  });

  it('each image has width and height dimensions', async () => {
    const res = await request(app).get('/api/portfolio');

    for (const image of res.body.images) {
      expect(image).toHaveProperty('width');
      expect(image).toHaveProperty('height');
      expect(typeof image.width).toBe('number');
      expect(typeof image.height).toBe('number');
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
  });
});
