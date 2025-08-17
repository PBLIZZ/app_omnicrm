-- =========================
-- 13_seed_test_contact.sql
-- Idempotent seed for a test contact in Supabase public schema
-- =========================

-- Optional: seed one visible contact for quick UI verification
insert into public.contacts (user_id, display_name, primary_email, source)
values ('3550f627-dbd7-4c5f-a13f-e59295c14676', 'Demo Contact', 'demo@example.com', 'manual');
