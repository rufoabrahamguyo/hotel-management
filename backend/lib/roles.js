/** All hotel + platform roles (stored in staff.role) */
export const ROLES = {
  SYSTEM_ADMIN: 'SystemAdmin',
  GENERAL_MANAGER: 'GeneralManager',
  FRONT_OFFICE_MANAGER: 'FrontOfficeManager',
  HOUSEKEEPING_MANAGER: 'HousekeepingManager',
  REVENUE_MANAGER: 'RevenueManager',
  MAINTENANCE_MANAGER: 'MaintenanceManager',
  ACCOUNTANT: 'Accountant',
  RECEPTIONIST: 'Receptionist',
  HOUSEKEEPING: 'Housekeeping',
  MAINTENANCE: 'Maintenance',
};

/** Legacy JWT / DB value from older installs */
export const LEGACY_ADMIN_ROLE = 'Admin';

/** Roles selectable when creating staff via API (SystemAdmin is bootstrap-only). */
export const ASSIGNABLE_STAFF_ROLES = Object.values(ROLES).filter((r) => r !== ROLES.SYSTEM_ADMIN);

export function normalizeJwtRole(role) {
  if (role === LEGACY_ADMIN_ROLE) return ROLES.SYSTEM_ADMIN;
  return role;
}

/** Which roles each actor may create (SystemAdmin cannot create another SystemAdmin via API). */
export const CREATABLE_ROLES = {
  [ROLES.SYSTEM_ADMIN]: [
    ROLES.GENERAL_MANAGER,
    ROLES.FRONT_OFFICE_MANAGER,
    ROLES.HOUSEKEEPING_MANAGER,
    ROLES.REVENUE_MANAGER,
    ROLES.MAINTENANCE_MANAGER,
    ROLES.ACCOUNTANT,
    ROLES.RECEPTIONIST,
    ROLES.HOUSEKEEPING,
    ROLES.MAINTENANCE,
  ],
  [ROLES.GENERAL_MANAGER]: [
    ROLES.FRONT_OFFICE_MANAGER,
    ROLES.HOUSEKEEPING_MANAGER,
    ROLES.REVENUE_MANAGER,
    ROLES.MAINTENANCE_MANAGER,
    ROLES.ACCOUNTANT,
  ],
  [ROLES.FRONT_OFFICE_MANAGER]: [ROLES.RECEPTIONIST],
  [ROLES.HOUSEKEEPING_MANAGER]: [ROLES.HOUSEKEEPING],
  [ROLES.MAINTENANCE_MANAGER]: [ROLES.MAINTENANCE],
  [ROLES.REVENUE_MANAGER]: [],
  [ROLES.ACCOUNTANT]: [],
};

export const USER_MANAGEMENT_ROLES = Object.keys(CREATABLE_ROLES).filter(
  (r) => CREATABLE_ROLES[r]?.length > 0,
);

export function canAccessUserManagement(role) {
  const r = normalizeJwtRole(role);
  return USER_MANAGEMENT_ROLES.includes(r);
}

export function creatableRolesForActor(role) {
  const r = normalizeJwtRole(role);
  return [...(CREATABLE_ROLES[r] ?? [])];
}

/** SQL fragment + params for listing staff visible to this actor */
export function listStaffVisibility(role, staffId) {
  const r = normalizeJwtRole(role);
  const id = Number(staffId);
  switch (r) {
    case ROLES.SYSTEM_ADMIN:
      return { where: 'TRUE', params: [] };
    case ROLES.GENERAL_MANAGER:
      return { where: "role <> 'SystemAdmin'", params: [] };
    case ROLES.FRONT_OFFICE_MANAGER:
      return {
        where: `(id = $1 OR (role = 'Receptionist' AND manager_staff_id = $1))`,
        params: [id],
      };
    case ROLES.HOUSEKEEPING_MANAGER:
      return {
        where: `(id = $1 OR (role = 'Housekeeping' AND manager_staff_id = $1))`,
        params: [id],
      };
    case ROLES.MAINTENANCE_MANAGER:
      return {
        where: `(id = $1 OR (role = 'Maintenance' AND manager_staff_id = $1))`,
        params: [id],
      };
    case ROLES.REVENUE_MANAGER:
    case ROLES.ACCOUNTANT:
      return { where: 'id = $1', params: [id] };
    default:
      return { where: 'FALSE', params: [] };
  }
}

export function canDeleteTarget(actorRole, actorId, target) {
  const ar = normalizeJwtRole(actorRole);
  const tid = Number(target.id);
  const aid = Number(actorId);
  if (tid === aid) return false;
  if (target.role === ROLES.SYSTEM_ADMIN) {
    if (ar !== ROLES.SYSTEM_ADMIN) return false;
    return tid !== aid;
  }
  if (ar === ROLES.SYSTEM_ADMIN) return true;
  if (ar === ROLES.GENERAL_MANAGER) {
    if (target.role === ROLES.SYSTEM_ADMIN || target.role === ROLES.GENERAL_MANAGER) return false;
    return true;
  }
  if (creatableRolesForActor(ar).length > 0) {
    const mid = target.manager_staff_id != null ? Number(target.manager_staff_id) : null;
    return mid === aid;
  }
  return false;
}

export function canChangeStatus(actorRole, actorId, target) {
  return canDeleteTarget(actorRole, actorId, target);
}

/** Roles that may update property settings (name, timezone, check-in/out). */
export const SETTINGS_WRITE_ROLES = [ROLES.SYSTEM_ADMIN, ROLES.GENERAL_MANAGER];

export function canWriteSettings(role) {
  return SETTINGS_WRITE_ROLES.includes(normalizeJwtRole(role));
}
