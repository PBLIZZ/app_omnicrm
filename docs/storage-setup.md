# Storage Setup Instructions

## Create Client Photos Bucket

Since the CLI doesn't support direct bucket creation, follow these steps in the Supabase Dashboard:

1. Go to https://supabase.com/dashboard/project/{PROJECT_REF}/storage/buckets
   - Replace `{PROJECT_REF}` with your actual project reference from the Supabase dashboard URL
2. Click "Create bucket"
3. Set the following:
   - **Name**: `client-photos`
   - **Public**: `false` (private bucket for security)
   - **File size limit**: `10MB` (reasonable for profile photos)
   - **Allowed MIME types**: `image/*` (images only)

## Storage Policies

The bucket will need these RLS policies (can be added via SQL editor):

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own client photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to read their own client photos
CREATE POLICY "Users can view own client photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own client photos
CREATE POLICY "Users can delete own client photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'client-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

## File Path Structure

Files will be stored with this structure:
```
client-photos/
├── {user_id}/
│   ├── {contact_id}-{uuid}.webp
│   └── {contact_id}-{uuid}.webp
```

This ensures user isolation and prevents conflicts.