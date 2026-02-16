-- Get your organization ID
-- Run this in Supabase SQL Editor to find your organization UUID

SELECT
  id as organization_id,
  name as organization_name,
  created_at
FROM public.organizations
ORDER BY created_at DESC;
