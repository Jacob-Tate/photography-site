import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Auth endpoints', () => {
  describe('POST /api/auth/check', () => {
    it('returns hasPassword: true for a password-protected album', async () => {
      const res = await request(app)
        .post('/api/auth/check')
        .send({ albumPath: 'albums/test-password' });

      expect(res.status).toBe(200);
      expect(res.body.hasPassword).toBe(true);
    });

    it('returns isUnlocked: false for a locked album', async () => {
      const res = await request(app)
        .post('/api/auth/check')
        .send({ albumPath: 'albums/test-password' });

      expect(res.status).toBe(200);
      expect(res.body.isUnlocked).toBe(false);
    });
  });

  describe('POST /api/auth/unlock', () => {
    it('returns success: true with correct password', async () => {
      const res = await request(app)
        .post('/api/auth/unlock')
        .send({ albumPath: 'albums/test-password', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 401 with success: false for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/unlock')
        .send({ albumPath: 'albums/test-password', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Session cookie flow', () => {
    it('can access album after unlocking via session', async () => {
      const agent = request.agent(app);

      // Unlock the album
      const unlockRes = await agent
        .post('/api/auth/unlock')
        .send({ albumPath: 'albums/test-password', password: 'testpass123' });

      expect(unlockRes.status).toBe(200);
      expect(unlockRes.body.success).toBe(true);

      // Verify the album is now accessible
      const albumRes = await agent.get('/api/albums/test-password');

      expect(albumRes.status).toBe(200);
      expect(albumRes.body).toHaveProperty('images');
    });
  });
});
