-- Migrate zones table from integer id to uuid primary key
-- Migration created: 2025-10-24
-- This removes the legacy zone_id column from projects and makes uuid_id the primary key of zones

BEGIN;

-- Step 1: Ensure all projects using zone_id have corresponding zone_uuid
-- Copy zone_id references to zone_uuid (if any projects still use zone_id)
UPDATE public.projects p
SET zone_uuid = z.uuid_id
FROM public.zones z
WHERE p.zone_id = z.id
  AND p.zone_uuid IS NULL;

-- Step 2: Drop the foreign key constraint from projects to zones.id
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_zone_id_fkey;

-- Step 3: Drop the zone_id column from projects (legacy integer reference)
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS zone_id;

-- Step 4: Drop the old integer primary key from zones
ALTER TABLE public.zones
  DROP CONSTRAINT IF EXISTS zones_pkey;

-- Step 5: Make uuid_id the new primary key
ALTER TABLE public.zones
  ADD PRIMARY KEY (uuid_id);

-- Step 6: Drop the integer id column entirely
ALTER TABLE public.zones
  DROP COLUMN IF EXISTS id;

COMMIT;

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE 'zones table successfully migrated to uuid primary key';
  RAISE NOTICE 'projects.zone_id column removed, using zone_uuid only';
END $$;
