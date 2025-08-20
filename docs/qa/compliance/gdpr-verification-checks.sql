-- GDPR Compliance Verification Checks
-- Run these queries in Supabase SQL Editor to verify GDPR implementation

-- ====================================
-- 1. TENANT ISOLATION CHECK
-- ====================================
-- This should return 0 for any other user (replace with a real UUID that is NOT the current auth.uid())
-- Example: Replace 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' with an actual UUID from your contacts table
-- but make sure it's NOT your current user's UUID

SELECT 'TENANT ISOLATION CHECK' as check_name;
-- Replace the UUID below with a real tenant_id that is NOT auth.uid()
-- SELECT count(*) as should_be_zero FROM public.contacts WHERE tenant_id <> auth.uid();

-- To help you find a different tenant_id, uncomment this:
-- SELECT DISTINCT tenant_id FROM public.contacts LIMIT 5;

-- ====================================
-- 2. RLS ON AUDIT LOG
-- ====================================
SELECT 'RLS AUDIT LOG CHECK' as check_name;
-- Simulate client permissions and try to access other tenant's audit logs
SET LOCAL ROLE authenticated;
-- This should return 0 rows (no access to other tenant's audit logs)
-- Replace the UUID with a real tenant_id that is NOT auth.uid()
-- SELECT count(*) as should_be_zero FROM public.erasure_audit_log WHERE tenant_id <> auth.uid();

-- Reset role
RESET ROLE;

-- ====================================
-- 3. VIEWS USABLE BY CLIENT
-- ====================================
SELECT 'VIEWS ACCESS CHECK' as check_name;
-- These should work for authenticated users
SET LOCAL ROLE authenticated;

-- Check if contact_table_view exists and is accessible
SELECT 'contact_table_view' as view_name, count(*) as row_count 
FROM public.contact_table_view 
LIMIT 1;

-- Check if interaction_timeline_view exists and is accessible
SELECT 'interaction_timeline_view' as view_name, count(*) as row_count 
FROM public.interaction_timeline_view 
LIMIT 1;

RESET ROLE;

-- ====================================
-- 4. CASCADE REALITY CHECK (DRY-RUN)
-- ====================================
SELECT 'CASCADE REALITY CHECK' as check_name;
-- This shows counts of what would be deleted for the current user
BEGIN;
  WITH t AS (SELECT auth.uid() AS tid)
  SELECT
    (SELECT count(*) FROM contacts c, t WHERE c.tenant_id = t.tid) AS contacts_count,
    (SELECT count(*) FROM interactions i, t WHERE i.tenant_id = t.tid) AS interactions_count,
    (SELECT count(*) FROM ai_overrides o, t WHERE o.tenant_id = t.tid) AS ai_overrides_count,
    (SELECT count(*) FROM erasure_audit_log e, t WHERE e.tenant_id = t.tid) AS audit_logs_count;
ROLLBACK;

-- ====================================
-- 5. RLS POLICY VERIFICATION
-- ====================================
SELECT 'RLS POLICIES CHECK' as check_name;
-- Check that RLS is enabled on key tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('contacts', 'interactions', 'ai_overrides', 'erasure_audit_log')
ORDER BY tablename;

-- List all policies on key tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('contacts', 'interactions', 'ai_overrides', 'erasure_audit_log')
ORDER BY tablename, policyname;

-- ====================================
-- 6. GRANTS VERIFICATION
-- ====================================
SELECT 'GRANTS VERIFICATION' as check_name;
-- Check grants on key tables and views
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
  AND table_name IN ('contacts', 'interactions', 'ai_overrides', 'erasure_audit_log', 'contact_table_view', 'interaction_timeline_view')
  AND grantee IN ('authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- ====================================
-- 7. ACCOUNT DELETION REQUESTS CHECK
-- ====================================
SELECT 'ACCOUNT DELETION REQUESTS CHECK' as check_name;
-- Check if account_deletion_requests table exists and has proper structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'account_deletion_requests'
ORDER BY ordinal_position;

-- Check current deletion requests
SELECT 
  id,
  tenant_id,
  requested_at,
  scheduled_deletion_at,
  status,
  created_at
FROM public.account_deletion_requests
WHERE tenant_id = auth.uid();
