import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/jwt.js';
import { canAccessUserManagement, normalizeJwtRole } from '../lib/roles.js';

/**
 * Valid JWT; sets req.auth = { staffId, role, username, organizationId, propertyId }
 * with role normalized (Admin → SystemAdmin). propertyId is null until the staff
 * member has selected a property (see /api/auth/select-property).
 */
export function requireStaffJwt(req, res, next) {
  const header = req.get('Authorization');
  const raw = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!raw) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(raw, getJwtSecret());
    const role = normalizeJwtRole(payload.role);
    const staffId = Number(payload.sub);
    const organizationId = Number(payload.organizationId);
    if (!Number.isFinite(staffId) || !Number.isFinite(organizationId)) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token.' });
    }
    req.auth = {
      staffId,
      role,
      username: payload.username,
      organizationId,
      propertyId: Number.isFinite(Number(payload.propertyId)) ? Number(payload.propertyId) : null,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session.' });
  }
}

/** Requires requireStaffJwt to have already run; 403s until a property has been selected. */
export function requirePropertyContext(req, res, next) {
  if (!req.auth?.propertyId) {
    return res.status(403).json({
      error: 'Forbidden',
      code: 'PROPERTY_REQUIRED',
      message: 'Select a property before using this feature.',
    });
  }
  next();
}

/**
 * Requires requireStaffJwt to have already run.
 * Only roles that may provision subordinate staff may continue.
 */
export function requireUserManagement(req, res, next) {
  if (!req.auth || !canAccessUserManagement(req.auth.role)) {
    return res.status(403).json({ error: 'Forbidden', message: 'You cannot manage staff accounts.' });
  }
  next();
}

/**
 * Standalone: validates JWT and requires a user-management role.
 * Prefer requireStaffJwt + requireUserManagement when organizationId is needed.
 */
export function requireUserManagementJwt(req, res, next) {
  requireStaffJwt(req, res, (err) => {
    if (err) return next(err);
    return requireUserManagement(req, res, next);
  });
}
