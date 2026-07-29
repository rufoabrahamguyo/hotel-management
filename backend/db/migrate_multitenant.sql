-- Multi-tenant SaaS: organizations own properties (hotels); staff get access to
-- one or more properties via staff_property. Idempotent — safe to re-run.
-- Existing single-tenant data (hotel_setting + all rooms/guests/reservations/staff)
-- is backfilled into one default organization + one default property.

CREATE TABLE IF NOT EXISTS organization (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_status_chk CHECK (status IN ('active', 'suspended'))
);

CREATE TABLE IF NOT EXISTS property (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organization (id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(80) NOT NULL DEFAULT 'Africa/Addis_Ababa',
  default_check_in VARCHAR(8) NOT NULL DEFAULT '15:00',
  default_check_out VARCHAR(8) NOT NULL DEFAULT '11:00',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT property_status_chk CHECK (status IN ('active', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_property_org ON property (organization_id);

CREATE TABLE IF NOT EXISTS staff_property (
  staff_id INTEGER NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES property (id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_property_property ON staff_property (property_id);

-- One default organization, created once.
INSERT INTO organization (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM organization);

-- One default property, seeded from the old single-row hotel_setting, created once.
-- hotel_setting is dropped at the end of this script's first run, so the reference
-- to it below is dynamic SQL guarded by an existence check — a plain SQL subquery
-- would fail to parse on a second run once the table is gone, even under a
-- WHERE NOT EXISTS guard that would otherwise skip it at execution time.
DO $$
DECLARE
  default_org_id INTEGER;
  legacy_name TEXT;
  legacy_tz TEXT;
  legacy_check_in TEXT;
  legacy_check_out TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM property) THEN
    SELECT id INTO default_org_id FROM organization ORDER BY id LIMIT 1;
    IF to_regclass('public.hotel_setting') IS NOT NULL THEN
      EXECUTE 'SELECT property_name, timezone, default_check_in, default_check_out FROM hotel_setting WHERE id = 1'
        INTO legacy_name, legacy_tz, legacy_check_in, legacy_check_out;
    END IF;
    INSERT INTO property (organization_id, name, timezone, default_check_in, default_check_out)
    VALUES (
      default_org_id,
      COALESCE(legacy_name, 'Hotel'),
      COALESCE(legacy_tz, 'Africa/Addis_Ababa'),
      COALESCE(legacy_check_in, '15:00'),
      COALESCE(legacy_check_out, '11:00')
    );
  END IF;
END $$;

-- staff belongs to an organization.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organization (id);

UPDATE staff SET organization_id = (SELECT id FROM organization ORDER BY id LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE staff ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_organization ON staff (organization_id);

-- room/guest/reservation belong to a property.
ALTER TABLE room ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES property (id);
UPDATE room SET property_id = (SELECT id FROM property ORDER BY id LIMIT 1) WHERE property_id IS NULL;
ALTER TABLE room ALTER COLUMN property_id SET NOT NULL;

ALTER TABLE guest ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES property (id);
UPDATE guest SET property_id = (SELECT id FROM property ORDER BY id LIMIT 1) WHERE property_id IS NULL;
ALTER TABLE guest ALTER COLUMN property_id SET NOT NULL;

ALTER TABLE reservation ADD COLUMN IF NOT EXISTS property_id INTEGER REFERENCES property (id);
UPDATE reservation SET property_id = (SELECT id FROM property ORDER BY id LIMIT 1) WHERE property_id IS NULL;
ALTER TABLE reservation ALTER COLUMN property_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_room_property ON room (property_id);
CREATE INDEX IF NOT EXISTS idx_guest_property ON guest (property_id);
CREATE INDEX IF NOT EXISTS idx_reservation_property ON reservation (property_id);

-- Room numbers are now unique per property, not globally.
ALTER TABLE room DROP CONSTRAINT IF EXISTS room_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_property_number ON room (property_id, number);

-- Backfill staff_property once: every pre-existing non-SystemAdmin staff member
-- gets access to the default property. Guarded so re-running this migration never
-- re-grants access to staff created (and assigned elsewhere) after the first run.
INSERT INTO staff_property (staff_id, property_id)
SELECT s.id, (SELECT id FROM property ORDER BY id LIMIT 1)
FROM staff s
WHERE s.role NOT IN ('SystemAdmin', 'Admin')
  AND NOT EXISTS (SELECT 1 FROM staff_property)
ON CONFLICT DO NOTHING;

-- Superseded by property.
DROP TABLE IF EXISTS hotel_setting;
