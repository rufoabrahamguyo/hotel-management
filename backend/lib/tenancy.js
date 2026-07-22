import { pool as defaultPool } from '../db/pool.js';
import { ROLES, normalizeJwtRole } from './roles.js';

/** Properties a staff member may open: SystemAdmin sees every active property in their org; everyone else sees only properties they've been explicitly assigned to. */
export async function resolveAccessibleProperties(
  { staffId, role, organizationId },
  db = defaultPool,
) {
  const r = normalizeJwtRole(role);
  if (r === ROLES.SYSTEM_ADMIN) {
    const { rows } = await db.query(
      `SELECT id, name, status FROM property WHERE organization_id = $1 AND status = 'active' ORDER BY name ASC`,
      [organizationId],
    );
    return rows;
  }
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.status
     FROM property p
     INNER JOIN staff_property sp ON sp.property_id = p.id
     WHERE sp.staff_id = $1 AND p.status = 'active'
     ORDER BY p.name ASC`,
    [staffId],
  );
  return rows;
}

/** Whether a staff member is allowed to select/operate in a given property right now. */
export async function staffHasPropertyAccess(
  { staffId, role, organizationId, propertyId },
  db = defaultPool,
) {
  const r = normalizeJwtRole(role);
  if (r === ROLES.SYSTEM_ADMIN) {
    const { rows } = await db.query(
      `SELECT 1 FROM property WHERE id = $1 AND organization_id = $2 AND status = 'active'`,
      [propertyId, organizationId],
    );
    return rows.length > 0;
  }
  const { rows } = await db.query(
    `SELECT 1 FROM staff_property sp
     INNER JOIN property p ON p.id = sp.property_id
     WHERE sp.staff_id = $1 AND sp.property_id = $2 AND p.status = 'active'`,
    [staffId, propertyId],
  );
  return rows.length > 0;
}
