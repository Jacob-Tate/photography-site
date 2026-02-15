import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/download/album/:albumPath', { timeout: 30000 }, () => {
  it('returns 200 with zip content-type for unlocked album', async () => {
    const res = await request(app).get('/api/download/album/test-cover');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('zip');
  });

  it('has content-disposition header', async () => {
    const res = await request(app).get('/api/download/album/test-cover');

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBeDefined();
  });

  it('returns 403 for password-protected album when not unlocked', async () => {
    const res = await request(app).get('/api/download/album/test-password');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('needsPassword', true);
  });

  it('returns 404 for non-existent album', async () => {
    const res = await request(app).get('/api/download/album/does-not-exist');

    expect(res.status).toBe(404);
  });
});
