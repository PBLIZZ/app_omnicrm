-- =====================================================
-- Storage Bucket: client-photos
-- =====================================================
-- Creates the client-photos storage bucket and RLS policies
-- for secure photo storage from the onboarding system.
--
-- Bucket Configuration:
-- - Private bucket (not publicly accessible)
-- - Requires authentication to access
-- - Supports signed URLs for secure temporary access
--
-- RLS Policies:
-- 1. Users can upload to their own folder
-- 2. Users can read from their own folder
-- 3. Users can delete from their own folder
-- =====================================================

-- Create the client-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos',
  'client-photos',
  false, -- Private bucket
  1048576, -- 1MB limit (1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- =====================================================
-- RLS Policies for client-photos bucket
-- =====================================================

-- Policy: Users can upload files to their own folder
-- Path format: client-photos/{user_id}/*
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read files from their own folder
CREATE POLICY "Users can read from own folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update files in their own folder
CREATE POLICY "Users can update own folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete files from their own folder
CREATE POLICY "Users can delete from own folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- Service Role Access (for server-side operations)
-- =====================================================

-- Policy: Service role can manage all files (for admin operations)
CREATE POLICY "Service role has full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'client-photos')
WITH CHECK (bucket_id = 'client-photos');

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Storage bucket "client-photos" created successfully';
  RAISE NOTICE '✅ RLS policies configured for secure access';
  RAISE NOTICE '';
  RAISE NOTICE 'Bucket Configuration:';
  RAISE NOTICE '  - Name: client-photos';
  RAISE NOTICE '  - Public: false (private)';
  RAISE NOTICE '  - Size Limit: 1MB';
  RAISE NOTICE '  - Allowed Types: JPEG, PNG, WebP, GIF';
  RAISE NOTICE '';
  RAISE NOTICE 'Access Patterns:';
  RAISE NOTICE '  - Upload: client-photos/{user_id}/{filename}';
  RAISE NOTICE '  - Read: Requires signed URL or authenticated request';
  RAISE NOTICE '  - Service role: Full access for server operations';
END $$;
