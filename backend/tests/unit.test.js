import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { API_FEATURES, roleMayUseFeature, requireFeature } from '../lib/permissions.js';
import { ROLES, SETTINGS_WRITE_ROLES, normalizeJwtRole, creatableRolesForActor, canDeleteTarget, canWriteSettings } from '../lib/roles.js';
import { isWeakJwtSecret, assertJwtSecretConfigured, getJwtSecret } from '../lib/jwt.js';
import { resolveAccessibleProperties, staffHasPropertyAccess } from '../lib/tenancy.js';

describe('normalizeJwtRole', () => {
  it('maps legacy Admin to SystemAdmin', () => {
    assert.equal(normalizeJwtRole('Admin'), ROLES.SYSTEM_ADMIN);
  });

  it('leaves known roles unchanged', () => {
    assert.equal(normalizeJwtRole(ROLES.RECEPTIONIST), ROLES.RECEPTIONIST);
  });
});

describe('API_FEATURES / roleMayUseFeature', () => {
  it('aligns settings with SETTINGS_WRITE_ROLES', () => {
    assert.deepEqual([...API_FEATURES.settings].sort(), [...SETTINGS_WRITE_ROLES].sort());
  });

  it('allows receptionist guests but not settings', () => {
    assert.equal(roleMayUseFeature(ROLES.RECEPTIONIST, 'guests'), true);
    assert.equal(roleMayUseFeature(ROLES.RECEPTIONIST, 'settings'), false);
    assert.equal(roleMayUseFeature(ROLES.RECEPTIONIST, 'reports'), false);
  });

  it('allows housekeeping rooms but not guests', () => {
    assert.equal(roleMayUseFeature(ROLES.HOUSEKEEPING, 'rooms'), true);
    assert.equal(roleMayUseFeature(ROLES.HOUSEKEEPING, 'guests'), false);
  });

  it('allows revenue manager reports', () => {
    assert.equal(roleMayUseFeature(ROLES.REVENUE_MANAGER, 'reports'), true);
    assert.equal(roleMayUseFeature(ROLES.REVENUE_MANAGER, 'guests'), false);
  });

  it('treats legacy Admin as SystemAdmin for features', () => {
    assert.equal(roleMayUseFeature('Admin', 'settings'), true);
  });
});

describe('requireFeature middleware', () => {
  it('returns 401 without auth', () => {
    const mw = requireFeature('guests');
    let status;
    let body;
    mw(
      {},
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
        throw new Error('should not call next');
      },
    );
    assert.equal(status, 401);
    assert.equal(body.error, 'Unauthorized');
  });

  it('returns 403 when role lacks feature', () => {
    const mw = requireFeature('reports');
    let status;
    mw(
      { auth: { role: ROLES.RECEPTIONIST } },
      {
        status(code) {
          status = code;
          return { json() {} };
        },
      },
      () => {
        throw new Error('should not call next');
      },
    );
    assert.equal(status, 403);
  });

  it('calls next when role is allowed', () => {
    const mw = requireFeature('guests');
    let called = false;
    mw({ auth: { role: ROLES.RECEPTIONIST } }, {}, () => {
      called = true;
    });
    assert.equal(called, true);
  });
});

describe('roles hierarchy', () => {
  it('lets FrontOfficeManager create Receptionist only', () => {
    assert.deepEqual(creatableRolesForActor(ROLES.FRONT_OFFICE_MANAGER), [ROLES.RECEPTIONIST]);
  });

  it('prevents self-delete', () => {
    assert.equal(
      canDeleteTarget(ROLES.SYSTEM_ADMIN, 1, { id: 1, role: ROLES.GENERAL_MANAGER }),
      false,
    );
  });

  it('limits settings write to SA and GM', () => {
    assert.equal(canWriteSettings(ROLES.SYSTEM_ADMIN), true);
    assert.equal(canWriteSettings(ROLES.GENERAL_MANAGER), true);
    assert.equal(canWriteSettings(ROLES.RECEPTIONIST), false);
  });
});

describe('jwt helpers', () => {
  it('flags missing and placeholder secrets as weak', () => {
    assert.equal(isWeakJwtSecret(null), true);
    assert.equal(isWeakJwtSecret('short'), true);
    assert.equal(isWeakJwtSecret('dev-insecure-change-me'), true);
    assert.equal(isWeakJwtSecret('a-sufficiently-long-secret-value'), false);
  });

  it('allows weak secret in non-production with warning path', () => {
    const prev = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    assert.doesNotThrow(() => assertJwtSecretConfigured());
    assert.equal(getJwtSecret(), 'dev-insecure-change-me');
    process.env.NODE_ENV = prev;
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  });
});

describe('tenancy (injected db)', () => {
  it('SystemAdmin lists org properties', async () => {
    const db = {
      async query(sql, params) {
        assert.match(sql, /organization_id/);
        assert.deepEqual(params, [9]);
        return { rows: [{ id: 1, name: 'Main', status: 'active' }] };
      },
    };
    const rows = await resolveAccessibleProperties(
      { staffId: 1, role: ROLES.SYSTEM_ADMIN, organizationId: 9 },
      db,
    );
    assert.equal(rows.length, 1);
  });

  it('non-admin uses staff_property join', async () => {
    const db = {
      async query(sql, params) {
        assert.match(sql, /staff_property/);
        assert.deepEqual(params, [5]);
        return { rows: [{ id: 2, name: 'Annex', status: 'active' }] };
      },
    };
    const rows = await resolveAccessibleProperties(
      { staffId: 5, role: ROLES.RECEPTIONIST, organizationId: 9 },
      db,
    );
    assert.equal(rows[0].id, 2);
  });

  it('staffHasPropertyAccess for SystemAdmin checks org', async () => {
    const db = {
      async query(_sql, params) {
        assert.deepEqual(params, [3, 9]);
        return { rows: [{}] };
      },
    };
    const ok = await staffHasPropertyAccess(
      { staffId: 1, role: ROLES.SYSTEM_ADMIN, organizationId: 9, propertyId: 3 },
      db,
    );
    assert.equal(ok, true);
  });

  it('staffHasPropertyAccess for line staff checks assignment', async () => {
    const db = {
      async query(_sql, params) {
        assert.deepEqual(params, [5, 3]);
        return { rows: [] };
      },
    };
    const ok = await staffHasPropertyAccess(
      { staffId: 5, role: ROLES.RECEPTIONIST, organizationId: 9, propertyId: 3 },
      db,
    );
    assert.equal(ok, false);
  });
});
