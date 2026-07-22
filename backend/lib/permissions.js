import { ROLES, normalizeJwtRole } from './roles.js';

/** API feature keys — must stay aligned with frontend auth/permissions.js route access. */
export const API_FEATURES = {
  guests: [
    ROLES.SYSTEM_ADMIN,
    ROLES.GENERAL_MANAGER,
    ROLES.FRONT_OFFICE_MANAGER,
    ROLES.RECEPTIONIST,
  ],
  rooms: [
    ROLES.SYSTEM_ADMIN,
    ROLES.GENERAL_MANAGER,
    ROLES.FRONT_OFFICE_MANAGER,
    ROLES.RECEPTIONIST,
    ROLES.HOUSEKEEPING_MANAGER,
    ROLES.HOUSEKEEPING,
    ROLES.MAINTENANCE_MANAGER,
    ROLES.MAINTENANCE,
  ],
  reports: [
    ROLES.SYSTEM_ADMIN,
    ROLES.GENERAL_MANAGER,
    ROLES.REVENUE_MANAGER,
    ROLES.ACCOUNTANT,
  ],
  /** Align with frontend ROLE_ROUTE_KEYS.settings and SETTINGS_WRITE_ROLES. */
  settings: [ROLES.SYSTEM_ADMIN, ROLES.GENERAL_MANAGER],
};

export function roleMayUseFeature(role, feature) {
  const r = normalizeJwtRole(role);
  const allowed = API_FEATURES[feature] ?? [];
  return allowed.includes(r);
}

/** Express middleware — requires requireStaffJwt first. */
export function requireFeature(feature) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }
    if (!roleMayUseFeature(req.auth.role, feature)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this feature.',
      });
    }
    next();
  };
}
