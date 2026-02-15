import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/albums', () => {
  it('returns album tree with groups and albums', async () => {
    const res = await request(app).get('/api/albums');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('albums');
    expect(res.body).toHaveProperty('groups');
    expect(Array.isArray(res.body.albums)).toBe(true);
    expect(Array.isArray(res.body.groups)).toBe(true);
  });

  it('empty directory does not appear in response', async () => {
    const res = await request(app).get('/api/albums');

    const allNames = [
      ...res.body.albums.map((a: { slug: string }) => a.slug),
      ...res.body.groups.map((g: { slug: string }) => g.slug),
    ];
    expect(allNames).not.toContain('test-empty');
  });

  it('hidden directories like .thumbnails are not in response', async () => {
    const res = await request(app).get('/api/albums');

    const allNames = [
      ...res.body.albums.map((a: { slug: string }) => a.slug),
      ...res.body.groups.map((g: { slug: string }) => g.slug),
    ];
    expect(allNames).not.toContain('.thumbnails');
  });

  it('test-group appears as a group with sub-albums', async () => {
    const res = await request(app).get('/api/albums');

    const group = res.body.groups.find(
      (g: { slug: string }) => g.slug === 'test-group'
    );
    expect(group).toBeDefined();
    expect(Array.isArray(group.albums)).toBe(true);
    expect(group.albums.length).toBeGreaterThanOrEqual(2);

    const subSlugs = group.albums.map((a: { slug: string }) => a.slug);
    expect(subSlugs).toContain('sub-album-a');
    expect(subSlugs).toContain('sub-album-b');
  });
});

describe('GET /api/albums/:slug - album details', () => {
  it('test-cover returns coverImage containing DSCF7315.jpg', async () => {
    const res = await request(app).get('/api/albums/test-cover');

    expect(res.status).toBe(200);
    expect(res.body.coverImage).toBeDefined();
    expect(res.body.coverImage).toContain('DSCF7315.jpg');
  });

  it('test-sort returns defaultSort filename-desc', async () => {
    const res = await request(app).get('/api/albums/test-sort');

    expect(res.status).toBe(200);
    expect(res.body.defaultSort).toBe('filename-desc');
  });

  it('test-tripdays returns tripDays true', async () => {
    const res = await request(app).get('/api/albums/test-tripdays');

    expect(res.status).toBe(200);
    expect(res.body.tripDays).toBe(true);
  });

  it('test-readme returns readme with rendered HTML', async () => {
    const res = await request(app).get('/api/albums/test-readme');

    expect(res.status).toBe(200);
    expect(res.body.readme).toBeDefined();
    expect(res.body.readme).toContain('<strong>test</strong>');
  });

  it('test-password returns needsPassword true and no images', async () => {
    const res = await request(app).get('/api/albums/test-password');

    expect(res.status).toBe(200);
    expect(res.body.needsPassword).toBe(true);
    expect(res.body.images).toBeUndefined();
  });

  it('test-captions has images with caption property', async () => {
    const res = await request(app).get('/api/albums/test-captions');

    expect(res.status).toBe(200);
    expect(res.body.images).toBeDefined();

    const captionedImages = res.body.images.filter(
      (img: { caption?: string }) => img.caption !== undefined
    );
    expect(captionedImages.length).toBeGreaterThan(0);

    for (const img of captionedImages) {
      expect(typeof img.caption).toBe('string');
      expect(img.caption.length).toBeGreaterThan(0);
    }
  });

  it('test-empty returns 404', async () => {
    const res = await request(app).get('/api/albums/test-empty');

    expect(res.status).toBe(404);
  });
});
