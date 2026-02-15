import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app';
import { config } from '../config';

const API_KEY = 'test-api-key';

beforeAll(() => {
  config.apiKey = API_KEY;
});
const ALBUM_PATH = 'albums/test-manage';
const ALBUM_DIR = path.join(config.photosDir, ALBUM_PATH);

// Files that tests may create and need to be cleaned up
const CLEANUP_FILES = [
  'password.txt',
  'cover.txt',
  'README.md',
  'trip_days.txt',
  'sort.txt',
  'ignorestats.txt',
  'DSCF7313.md',
];

afterAll(() => {
  for (const file of CLEANUP_FILES) {
    const filePath = path.join(ALBUM_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

describe('Manage endpoints - auth', () => {
  const postEndpoints = [
    '/api/manage/password',
    '/api/manage/cover',
    '/api/manage/readme',
    '/api/manage/caption',
    '/api/manage/tripdays',
    '/api/manage/sort',
    '/api/manage/ignorestats',
    '/api/manage/delete',
  ];

  it.each(postEndpoints)(
    'POST %s returns 401 without API key',
    async (endpoint) => {
      const res = await request(app).post(endpoint).send({});
      expect(res.status).toBe(401);
    },
  );
});

describe('POST /api/manage/password', () => {
  it('sets a password', async () => {
    const res = await request(app)
      .post('/api/manage/password')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const content = fs.readFileSync(
      path.join(ALBUM_DIR, 'password.txt'),
      'utf-8',
    );
    expect(content).toBe('secret123');
  });

  it('removes a password with empty string', async () => {
    const res = await request(app)
      .post('/api/manage/password')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, password: '' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      fs.existsSync(path.join(ALBUM_DIR, 'password.txt')),
    ).toBe(false);
  });
});

describe('POST /api/manage/cover', () => {
  it('sets a cover filename', async () => {
    const res = await request(app)
      .post('/api/manage/cover')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, filename: 'DSCF7313.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const content = fs.readFileSync(
      path.join(ALBUM_DIR, 'cover.txt'),
      'utf-8',
    );
    expect(content).toBe('DSCF7313.jpg');
  });

  it('removes the cover with empty string', async () => {
    const res = await request(app)
      .post('/api/manage/cover')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, filename: '' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      fs.existsSync(path.join(ALBUM_DIR, 'cover.txt')),
    ).toBe(false);
  });
});

describe('POST/GET /api/manage/readme', () => {
  it('creates a README', async () => {
    const res = await request(app)
      .post('/api/manage/readme')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, content: '# Test Album' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('reads the README', async () => {
    const res = await request(app)
      .get('/api/manage/readme')
      .set('x-api-key', API_KEY)
      .query({ albumPath: ALBUM_PATH });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('# Test Album');
  });

  it('removes the README with empty content', async () => {
    const res = await request(app)
      .post('/api/manage/readme')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, content: '' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      fs.existsSync(path.join(ALBUM_DIR, 'README.md')),
    ).toBe(false);
  });
});

describe('POST/GET /api/manage/caption', () => {
  const imagePath = 'albums/test-manage/DSCF7313.jpg';

  it('creates a caption', async () => {
    const res = await request(app)
      .post('/api/manage/caption')
      .set('x-api-key', API_KEY)
      .send({ imagePath, content: 'A beautiful sunset' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('reads the caption', async () => {
    const res = await request(app)
      .get('/api/manage/caption')
      .set('x-api-key', API_KEY)
      .query({ imagePath });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('A beautiful sunset');
  });

  it('removes the caption with empty content', async () => {
    const res = await request(app)
      .post('/api/manage/caption')
      .set('x-api-key', API_KEY)
      .send({ imagePath, content: '' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      fs.existsSync(path.join(ALBUM_DIR, 'DSCF7313.md')),
    ).toBe(false);
  });
});

describe('POST/GET /api/manage/tripdays', () => {
  it('toggles trip days on', async () => {
    const res = await request(app)
      .post('/api/manage/tripdays')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH });

    expect(res.status).toBe(200);
    expect(res.body.tripDays).toBe(true);
  });

  it('GET confirms trip days is enabled', async () => {
    const res = await request(app)
      .get('/api/manage/tripdays')
      .set('x-api-key', API_KEY)
      .query({ albumPath: ALBUM_PATH });

    expect(res.status).toBe(200);
    expect(res.body.tripDays).toBe(true);
  });

  it('toggles trip days off', async () => {
    const res = await request(app)
      .post('/api/manage/tripdays')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH });

    expect(res.status).toBe(200);
    expect(res.body.tripDays).toBe(false);
  });
});

describe('POST/GET /api/manage/sort', () => {
  it('sets sort to filename-asc', async () => {
    const res = await request(app)
      .post('/api/manage/sort')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, sort: 'filename-asc' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET confirms sort is filename-asc', async () => {
    const res = await request(app)
      .get('/api/manage/sort')
      .set('x-api-key', API_KEY)
      .query({ albumPath: ALBUM_PATH });

    expect(res.status).toBe(200);
    expect(res.body.sort).toBe('filename-asc');
  });

  it('removes sort by setting date-desc (default)', async () => {
    const res = await request(app)
      .post('/api/manage/sort')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, sort: 'date-desc' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      fs.existsSync(path.join(ALBUM_DIR, 'sort.txt')),
    ).toBe(false);
  });
});

describe('POST/GET /api/manage/ignorestats', () => {
  it('enables ignorestats', async () => {
    const res = await request(app)
      .post('/api/manage/ignorestats')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, ignored: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET confirms ignorestats is enabled', async () => {
    const res = await request(app)
      .get('/api/manage/ignorestats')
      .set('x-api-key', API_KEY)
      .query({ albumPath: ALBUM_PATH });

    expect(res.status).toBe(200);
    expect(res.body.ignored).toBe(true);
  });

  it('disables ignorestats', async () => {
    const res = await request(app)
      .post('/api/manage/ignorestats')
      .set('x-api-key', API_KEY)
      .send({ albumPath: ALBUM_PATH, ignored: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(
      fs.existsSync(path.join(ALBUM_DIR, 'ignorestats.txt')),
    ).toBe(false);
  });
});

describe('Path traversal protection', () => {
  it('rejects path traversal in albumPath', async () => {
    const res = await request(app)
      .post('/api/manage/password')
      .set('x-api-key', API_KEY)
      .send({ albumPath: 'albums/../../etc', password: 'hack' });

    expect(res.status).toBe(403);
  });
});
