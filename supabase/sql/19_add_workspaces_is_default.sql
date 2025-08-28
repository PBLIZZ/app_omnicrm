-- Add is_default column to workspaces table
-- This column was missing from the original schema but is expected by the application

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false NOT NULL;

-- Add index for better query performance on default workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_is_default ON workspaces(is_default) WHERE is_default = true;

-- Add comment for documentation
COMMENT ON COLUMN workspaces.is_default IS 'Whether this is the default workspace for the user';
