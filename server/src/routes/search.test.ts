import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/search', { timeout: 30000 }, () => {
  it('returns results containing GFXR7398.jpg when searching for Cat', async () => {
    const res = await request(app).get('/api/search').query({ q: 'Cat' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    const filenames = res.body.results.map(
      (r: { filename: string }) => r.filename
    );
    expect(filenames).toContain('GFXR7398.jpg');
  });

  it('returns results containing DSCF9948.jpg when searching for Kirkland', async () => {
    const res = await request(app).get('/api/search').query({ q: 'Kirkland' });

    expect(res.status).toBe(200);
    const filenames = res.body.results.map(
      (r: { filename: string }) => r.filename
    );
    expect(filenames).toContain('DSCF9948.jpg');
  });

  it('returns empty results for nonexistent keyword', async () => {
    const res = await request(app).get('/api/search').query({ q: 'nonexistent' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('returns empty results for empty query', async () => {
    const res = await request(app).get('/api/search').query({ q: '' });

    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });
});
