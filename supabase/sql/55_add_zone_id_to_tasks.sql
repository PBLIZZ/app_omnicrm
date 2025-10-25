-- =============================================================================
-- Add zone_id to tasks table
-- 
-- This allows tasks to be assigned directly to zones, not just through projects.
-- This is useful for standalone tasks that don't belong to a project but need
-- zone organization (e.g., "quick shopping tasks" in a "Shopping" zone).
-- =============================================================================

BEGIN;

-- Add zone_id column to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES public.zones(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_zone_id ON public.tasks(zone_id);

-- Add RLS policy for zone_id (if needed, zone_id is already covered by existing tasks RLS)
-- The existing "users_can_manage_own_tasks" policy already covers all columns including zone_id

RAISE NOTICE 'SUCCESS: zone_id column added to tasks table.';

COMMIT;

RAISE NOTICE 'MIGRATION COMPLETE: Tasks can now be assigned to zones directly! 🚀';

