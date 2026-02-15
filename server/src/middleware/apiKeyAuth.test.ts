import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { apiKeyAuth } from './apiKeyAuth';

vi.mock('../config', () => ({
  config: {
    apiKey: 'test-api-key-123',
  },
}));

function createMocks(headers: Record<string, string | undefined> = {}) {
  const req = { headers } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('apiKeyAuth', () => {
  it('calls next() when API key matches', () => {
    const { req, res, next } = createMocks({ 'x-api-key': 'test-api-key-123' });
    apiKeyAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when API key is missing', () => {
    const { req, res, next } = createMocks({});
    apiKeyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid API key' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when API key is wrong', () => {
    const { req, res, next } = createMocks({ 'x-api-key': 'wrong-key' });
    apiKeyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('apiKeyAuth when key is not configured', () => {
  it('returns 500 when server has no API key', async () => {
    const { config } = await import('../config');
    const original = config.apiKey;
    config.apiKey = '';

    const { req, res, next } = createMocks({ 'x-api-key': 'anything' });
    apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'API key not configured on server' });
    expect(next).not.toHaveBeenCalled();

    config.apiKey = original;
  });
});
