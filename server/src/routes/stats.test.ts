import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/stats', { timeout: 30000 }, () => {
  it('returns 200 with totalPhotos > 0 and totalAlbums > 0', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body.totalPhotos).toBeGreaterThan(0);
    expect(res.body.totalAlbums).toBeGreaterThan(0);
  });

  it('has cameras array with entries', async () => {
    const res = await request(app).get('/api/stats');

    expect(Array.isArray(res.body.cameras)).toBe(true);
    expect(res.body.cameras.length).toBeGreaterThan(0);
    expect(res.body.cameras[0]).toHaveProperty('name');
    expect(res.body.cameras[0]).toHaveProperty('count');
  });

  it('has byHour array of length 24', async () => {
    const res = await request(app).get('/api/stats');

    expect(Array.isArray(res.body.byHour)).toBe(true);
    expect(res.body.byHour).toHaveLength(24);
  });
});

describe('GET /api/stats/filter', { timeout: 30000 }, () => {
  it('returns results when filtering by a known camera', async () => {
    // First get stats to find a camera that exists
    const statsRes = await request(app).get('/api/stats');
    const cameras = statsRes.body.cameras;
    expect(cameras.length).toBeGreaterThan(0);

    const cameraName = cameras[0].name;
    const res = await request(app).get(
      `/api/stats/filter?field=camera&value=${encodeURIComponent(cameraName)}`
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.field).toBe('camera');
    expect(res.body.value).toBe(cameraName);
  });

  it('returns 400 with invalid field', async () => {
    const res = await request(app).get(
      '/api/stats/filter?field=invalid&value=test'
    );

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
