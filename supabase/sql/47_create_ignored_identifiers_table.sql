-- Migration 47: CREATE ignored_identifiers TABLE
-- Description: Creates a table to store identifiers that the user has explicitly
-- marked as irrelevant. This prevents the system from repeatedly creating
-- 'contact_approval' tasks for the same non-contact identifiers (e.g., no-reply@ emails).

-- Drop the table if it exists to ensure a clean slate
DROP TABLE IF EXISTS public.ignored_identifiers CASCADE;

-- Create the ignored_identifiers table
CREATE TABLE public.ignored_identifiers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL, -- 'email', 'phone', 'handle', etc.
  value TEXT NOT NULL, -- The actual identifier, e.g., 'no-reply@company.com'
  reason TEXT, -- Optional: why this was ignored (e.g., 'marketing email', 'system notification')
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ignored_identifiers_pkey PRIMARY KEY (id),
  CONSTRAINT ignored_identifiers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ensure each user can only ignore an identifier once
  CONSTRAINT ignored_identifiers_user_kind_value_unique UNIQUE (user_id, kind, value),
  
  -- Ensure kind matches the same values as contact_identities for consistency
  CONSTRAINT ignored_identifiers_kind_check CHECK (
    kind = ANY (ARRAY[
      'email'::text,
      'phone'::text,
      'handle'::text,
      'provider_id'::text
    ])
  )
);

-- Create indexes for efficient querying
-- Index for fast lookup during contact extraction process
CREATE INDEX IF NOT EXISTS ignored_identifiers_user_kind_value_idx
  ON public.ignored_identifiers (user_id, kind, value);

-- Index for user management UI (show all ignored identifiers for a user)
CREATE INDEX IF NOT EXISTS ignored_identifiers_user_created_idx
  ON public.ignored_identifiers (user_id, created_at DESC);

-- Index for kind-based queries (e.g., show all ignored emails)
CREATE INDEX IF NOT EXISTS ignored_identifiers_user_kind_idx
  ON public.ignored_identifiers (user_id, kind);

-- Add comments to document the table purpose
COMMENT ON TABLE public.ignored_identifiers IS 'A blocklist of identifiers (emails, phones, handles) that the user has marked as not belonging to a contact. The contact extraction process checks this table to avoid creating repeated suggestions for irrelevant identifiers like no-reply emails, system notifications, etc. Created Oct 7, 2025.';

COMMENT ON COLUMN public.ignored_identifiers.kind IS 'The type of identifier: email, phone, handle, or provider_id. Must match contact_identities.kind values for consistency.';

COMMENT ON COLUMN public.ignored_identifiers.value IS 'The actual identifier value that should be ignored, e.g., no-reply@company.com or +1-800-SPAM-CALL.';

COMMENT ON COLUMN public.ignored_identifiers.reason IS 'Optional human-readable reason why this identifier was ignored, for user reference and debugging.';
