import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/tags', { timeout: 30000 }, () => {
  it('returns 200 with tags array', async () => {
    const res = await request(app).get('/api/tags');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tags');
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.tags.length).toBeGreaterThan(0);
  });

  it('tags array is sorted by count descending', async () => {
    const res = await request(app).get('/api/tags');

    const tags = res.body.tags as { tag: string; count: number }[];
    for (let i = 1; i < tags.length; i++) {
      expect(tags[i - 1].count).toBeGreaterThanOrEqual(tags[i].count);
    }
  });

  it('known keywords like "Cat" or "Kirkland" appear in tags', async () => {
    const res = await request(app).get('/api/tags');

    const tagNames = res.body.tags.map((t: { tag: string }) => t.tag);
    expect(tagNames).toContain('Cat');
    expect(tagNames).toContain('Kirkland');
  });
});
