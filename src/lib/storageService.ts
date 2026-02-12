import { supabase } from './supabase'

/**
 * Upload an organization logo to Supabase Storage
 * @param orgId - Organization ID
 * @param file - Image file to upload
 * @returns Public URL of the uploaded logo
 */
export async function uploadOrganizationLogo(
  orgId: string,
  file: File
): Promise<string> {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.')
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit.')
  }

  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const fileName = `${orgId}/logo-${timestamp}.${fileExt}`

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('organization-logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload logo: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('organization-logos')
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Delete an organization logo from Supabase Storage
 * @param logoUrl - Full URL of the logo to delete
 */
export async function deleteOrganizationLogo(logoUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const url = new URL(logoUrl)
    const pathMatch = url.pathname.match(/organization-logos\/(.+)/)
    
    if (!pathMatch) {
      throw new Error('Invalid logo URL format')
    }

    const filePath = pathMatch[1]

    // Delete from storage
    const { error } = await supabase.storage
      .from('organization-logos')
      .remove([filePath])

    if (error) {
      throw new Error(`Failed to delete logo: ${error.message}`)
    }
  } catch (err) {
    console.error('Error deleting organization logo:', err)
    throw err
  }
}
