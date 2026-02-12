-- ============================================================================
-- 020: Avatar storage bucket setup (FIX - Drop existing policies first)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload avatars for org members" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update avatars for org members" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete avatars for org members" ON storage.objects;

-- Create storage bucket for avatars (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Storage policies for avatars bucket

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Allow public read access to all avatars
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Admin policies - admins can manage avatars for users in their org
CREATE POLICY "Admins can upload avatars for org members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (SELECT private.is_god())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om_target
      JOIN public.organization_members om_admin
        ON om_admin.organization_id = om_target.organization_id
       AND om_admin.user_id = (SELECT auth.uid())
       AND om_admin.role = 'admin'
      WHERE om_target.user_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Admins can update avatars for org members"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (SELECT private.is_god())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om_target
      JOIN public.organization_members om_admin
        ON om_admin.organization_id = om_target.organization_id
       AND om_admin.user_id = (SELECT auth.uid())
       AND om_admin.role = 'admin'
      WHERE om_target.user_id::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "Admins can delete avatars for org members"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (SELECT private.is_god())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om_target
      JOIN public.organization_members om_admin
        ON om_admin.organization_id = om_target.organization_id
       AND om_admin.user_id = (SELECT auth.uid())
       AND om_admin.role = 'admin'
      WHERE om_target.user_id::text = (storage.foldername(name))[1]
    )
  )
);
