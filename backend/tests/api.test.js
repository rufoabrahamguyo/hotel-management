import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../app.js';
import { getJwtSecret } from '../lib/jwt.js';
import { ROLES } from '../lib/roles.js';
import { requireStaffJwt, requirePropertyContext } from '../middleware/requireStaffJwt.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-16-chars';

function signToken(overrides = {}) {
  return jwt.sign(
    {
      role: ROLES.RECEPTIONIST,
      username: 'desk',
      organizationId: 1,
      propertyId: null,
      ...overrides,
      sub: String(overrides.sub ?? 10),
    },
    getJwtSecret(),
    { expiresIn: '1h' },
  );
}

describe('API health', () => {
  it('GET /api/health returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  it('unknown route returns 404', async () => {
    const app = createApp();
    const res = await request(app).get('/api/does-not-exist');
    assert.equal(res.status, 404);
  });
});

describe('auth middleware', () => {
  it('requireStaffJwt rejects missing bearer', () => {
    let status;
    requireStaffJwt(
      { get() { return null; } },
      {
        status(code) {
          status = code;
          return { json() {} };
        },
      },
      () => {
        throw new Error('next');
      },
    );
    assert.equal(status, 401);
  });

  it('requireStaffJwt accepts valid token', () => {
    const token = signToken({ propertyId: 2 });
    const req = {
      get(name) {
        return name === 'Authorization' ? `Bearer ${token}` : null;
      },
    };
    let nextCalled = false;
    requireStaffJwt(req, {}, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(req.auth.staffId, 10);
    assert.equal(req.auth.propertyId, 2);
    assert.equal(req.auth.role, ROLES.RECEPTIONIST);
  });

  it('requirePropertyContext returns PROPERTY_REQUIRED code', () => {
    let status;
    let body;
    requirePropertyContext(
      { auth: { propertyId: null } },
      {
        status(code) {
          status = code;
          return {
            json(payload) {
              body = payload;
            },
          };
        },
      },
      () => {
        throw new Error('next');
      },
    );
    assert.equal(status, 403);
    assert.equal(body.code, 'PROPERTY_REQUIRED');
  });
});

describe('protected routes without property', () => {
  let app;
  before(() => {
    app = createApp();
  });

  it('GET /api/rooms without auth → 401', async () => {
    const res = await request(app).get('/api/rooms');
    assert.equal(res.status, 401);
  });

  it('GET /api/rooms with token but no property → 403 PROPERTY_REQUIRED', async () => {
    const token = signToken({ propertyId: null });
    const res = await request(app).get('/api/rooms').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'PROPERTY_REQUIRED');
  });

  it('GET /api/settings with receptionist + property → 403 feature', async () => {
    const token = signToken({ role: ROLES.RECEPTIONIST, propertyId: 1 });
    const res = await request(app).get('/api/settings').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 403);
    assert.match(res.body.message || '', /feature|access/i);
  });
});
