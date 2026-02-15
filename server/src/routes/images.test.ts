import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Image endpoints', () => {
  describe('GET /api/images/thumbnail/*', { timeout: 30000 }, () => {
    it('returns 200 with image/jpeg for a valid image', async () => {
      const res = await request(app)
        .get('/api/images/thumbnail/portfolio/DSCF7313.jpg');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/jpeg');
    });

    it('returns 404 for a nonexistent image', async () => {
      const res = await request(app)
        .get('/api/images/thumbnail/nonexistent.jpg');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/images/full/*', () => {
    it('returns 200 for a valid image', async () => {
      const res = await request(app)
        .get('/api/images/full/portfolio/DSCF7313.jpg');

      expect(res.status).toBe(200);
    });

    it('returns error for path traversal attempt', async () => {
      const res = await request(app)
        .get('/api/images/full/..%2F..%2Fetc%2Fpasswd');

      expect([400, 404]).toContain(res.status);
    });
  });

  describe('GET /api/images/download/*', () => {
    it('returns Content-Disposition with attachment', async () => {
      const res = await request(app)
        .get('/api/images/download/portfolio/DSCF7313.jpg');

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('GET /api/images/video/*', () => {
    it('returns 200 with video/mp4 content-type', async () => {
      const res = await request(app)
        .get('/api/images/video/albums/test-video/file_example_MP4_1920_18MG.mp4');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('video/mp4');
    });

    it('returns 206 with Content-Range for range requests', async () => {
      const res = await request(app)
        .get('/api/images/video/albums/test-video/file_example_MP4_1920_18MG.mp4')
        .set('Range', 'bytes=0-1023');

      expect(res.status).toBe(206);
      expect(res.headers['content-range']).toMatch(/^bytes 0-1023\//);
    });
  });
});
