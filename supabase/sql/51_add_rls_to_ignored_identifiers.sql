-- =========================
-- 051_add_rls_to_ignored_identifiers.sql
-- ADD RLS policies to ignored_identifiers table
-- Description: Enables Row Level Security and creates policies to ensure users
-- can only access their own ignored identifiers.
-- =========================

-- Step 1: Enable Row Level Security
ALTER TABLE public.ignored_identifiers ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Users can view their own ignored identifiers" ON public.ignored_identifiers;
DROP POLICY IF EXISTS "Users can insert their own ignored identifiers" ON public.ignored_identifiers;
DROP POLICY IF EXISTS "Users can update their own ignored identifiers" ON public.ignored_identifiers;
DROP POLICY IF EXISTS "Users can delete their own ignored identifiers" ON public.ignored_identifiers;
DROP POLICY IF EXISTS "Service role has full access to ignored identifiers" ON public.ignored_identifiers;

-- Step 3: Create RLS policies for authenticated users

-- SELECT policy: Users can only view their own ignored identifiers
CREATE POLICY "Users can view their own ignored identifiers"
  ON public.ignored_identifiers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy: Users can only create ignored identifiers for themselves
CREATE POLICY "Users can insert their own ignored identifiers"
  ON public.ignored_identifiers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can only update their own ignored identifiers
CREATE POLICY "Users can update their own ignored identifiers"
  ON public.ignored_identifiers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can only delete their own ignored identifiers
CREATE POLICY "Users can delete their own ignored identifiers"
  ON public.ignored_identifiers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 4: Create service role policy for backend operations
-- The service role needs full access for system operations like bulk imports

CREATE POLICY "Service role has full access to ignored identifiers"
  ON public.ignored_identifiers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Add comment to document the RLS setup
COMMENT ON TABLE public.ignored_identifiers IS 
  'A blocklist of identifiers (emails, phones, handles) that the user has marked as not belonging to a contact. The contact extraction process checks this table to avoid creating repeated suggestions for irrelevant identifiers like no-reply emails, system notifications, etc. Created Oct 7, 2025. RLS enabled Oct 7, 2025.';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- RLS Configuration for ignored_identifiers:
-- 1. ✅ Row Level Security ENABLED
-- 2. ✅ SELECT policy: Users can view only their own ignored identifiers
-- 3. ✅ INSERT policy: Users can create only for themselves
-- 4. ✅ UPDATE policy: Users can update only their own records
-- 5. ✅ DELETE policy: Users can delete only their own records
-- 6. ✅ Service role has full access for system operations
-- ============================================================================
