-- ============================================================================
-- 019: Organization Logos
-- Add logo_url column and create storage bucket for organization logos
-- ============================================================================

-- Add logo_url column to organizations table
alter table public.organizations add column logo_url text;

comment on column public.organizations.logo_url is 'URL to the organization logo stored in Supabase Storage';

-- Create storage bucket for organization logos
insert into storage.buckets (id, name, public)
values ('organization-logos', 'organization-logos', true);

-- Storage policies for organization logos

-- Allow authenticated users to view logos (public bucket, so everyone can see)
create policy "Anyone can view organization logos"
  on storage.objects for select
  using (bucket_id = 'organization-logos');

-- Allow gods and admins to upload logos
create policy "Admins and gods can upload organization logos"
  on storage.objects for insert
  with check (
    bucket_id = 'organization-logos'
    and (
      (select private.is_god())
      or exists (
        select 1
        from public.organization_members om
        where om.user_id = auth.uid()
        and om.role = 'admin'
        and om.organization_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- Allow gods and admins to update logos
create policy "Admins and gods can update organization logos"
  on storage.objects for update
  using (
    bucket_id = 'organization-logos'
    and (
      (select private.is_god())
      or exists (
        select 1
        from public.organization_members om
        where om.user_id = auth.uid()
        and om.role = 'admin'
        and om.organization_id::text = (storage.foldername(name))[1]
      )
    )
  );

-- Allow gods and admins to delete logos
create policy "Admins and gods can delete organization logos"
  on storage.objects for delete
  using (
    bucket_id = 'organization-logos'
    and (
      (select private.is_god())
      or exists (
        select 1
        from public.organization_members om
        where om.user_id = auth.uid()
        and om.role = 'admin'
        and om.organization_id::text = (storage.foldername(name))[1]
      )
    )
  );
