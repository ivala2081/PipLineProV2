import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useRef, useEffect } from 'react'
import { Image, Trash, Upload } from '@phosphor-icons/react'
import { Card, Button, Input, Label, Separator } from '@ds'
import { useToast } from '@/hooks/useToast'
import { useUpdateOrganization } from '@/hooks/queries/useOrgMutations'
import {
  updateOrganizationSchema,
  type UpdateOrganizationValues,
} from '@/schemas/organizationSchema'
import type { Organization } from '@/lib/database.types'
import { uploadOrganizationLogo, deleteOrganizationLogo } from '@/lib/storageService'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { ImageCropperDialog } from '@/components/ImageCropperDialog'

interface SettingsTabProps {
  org: Organization
  orgId: string
}

export function SettingsTab({ org, orgId }: SettingsTabProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const updateOrg = useUpdateOrganization(orgId)
  const { refreshOrgs } = useOrganization()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [logoPreview, setLogoPreview] = useState<string | null>(org.logo_url)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const form = useForm<UpdateOrganizationValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: org.name,
      is_active: org.is_active,
      logo_url: org.logo_url,
    },
  })

  // Sync logo preview when org data updates
  useEffect(() => {
    setLogoPreview(org.logo_url)
  }, [org.logo_url])

  // Cleanup object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop)
      }
    }
  }, [imageToCrop])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, GIF, or WebP image.',
        variant: 'error',
      })
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'File size exceeds 5MB limit.',
        variant: 'error',
      })
      return
    }

    // Store the selected file and show cropper
    setSelectedFile(file)
    const imageUrl = URL.createObjectURL(file)
    setImageToCrop(imageUrl)
    setCropperOpen(true)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!selectedFile) return

    setIsUploadingLogo(true)
    setCropperOpen(false)

    try {
      // Create a File from the cropped Blob
      const croppedFile = new File([croppedBlob], 'logo.jpg', {
        type: 'image/jpeg',
      })

      const publicUrl = await uploadOrganizationLogo(orgId, croppedFile)

      // Update form and preview
      form.setValue('logo_url', publicUrl)
      setLogoPreview(publicUrl)

      // Save the change immediately to database
      await updateOrg.mutateAsync({ ...form.getValues(), logo_url: publicUrl })

      // Refresh organizations in provider to update header/sidebar
      await refreshOrgs()

      toast({ title: t('organizations.settings.logoUploaded'), variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    } finally {
      setIsUploadingLogo(false)
      setSelectedFile(null)
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop)
        setImageToCrop(null)
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCloseCropper = () => {
    setCropperOpen(false)
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
      setImageToCrop(null)
    }
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!logoPreview) return

    try {
      if (org.logo_url) {
        await deleteOrganizationLogo(org.logo_url)
      }

      form.setValue('logo_url', null)
      setLogoPreview(null)

      // Save the change immediately
      await updateOrg.mutateAsync({ ...form.getValues(), logo_url: null })

      // Refresh organizations in provider to update header/sidebar
      await refreshOrgs()

      toast({ title: t('organizations.settings.logoRemoved'), variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await updateOrg.mutateAsync(data)
      toast({ title: t('organizations.toast.updated'), variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  })

  return (
    <div className="space-y-lg pt-md">
      {/* Logo Settings */}
      <Card padding="spacious" className="space-y-lg border border-black/5 bg-bg1">
        <div>
          <h2 className="text-lg font-semibold">
            {t('organizations.settings.logoTitle', 'Organization Logo')}
          </h2>
          <p className="text-sm text-black/60">
            {t(
              'organizations.settings.logoSubtitle',
              'Upload your organization logo. Recommended size: 512x512px',
            )}
          </p>
        </div>

        <div className="flex items-center gap-lg">
          {/* Logo Preview */}
          <div className="relative">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border-2 border-black/10 bg-black/5">
              {logoPreview ? (
                <img src={logoPreview} alt="Organization logo" className="size-full object-cover" />
              ) : (
                <Image size={32} className="text-black/40" />
              )}
            </div>
          </div>

          {/* Upload Actions */}
          <div className="flex flex-col gap-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleLogoChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
            >
              <Upload size={16} />
              {isUploadingLogo
                ? t('organizations.settings.uploading', 'Uploading...')
                : t('organizations.settings.uploadLogo', 'Upload Logo')}
            </Button>
            {logoPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveLogo}
                disabled={isUploadingLogo}
              >
                <Trash size={16} />
                {t('organizations.settings.removeLogo', 'Remove Logo')}
              </Button>
            )}
            <p className="text-xs text-black/40">
              {t('organizations.settings.logoFormats', 'JPG, PNG, GIF or WebP. Max 5MB.')}
            </p>
          </div>
        </div>
      </Card>

      {/* General Settings */}
      <Card padding="spacious" className="space-y-lg border border-black/5 bg-bg1">
        <div>
          <h2 className="text-lg font-semibold">{t('organizations.settings.title')}</h2>
          <p className="text-sm text-black/60">{t('organizations.settings.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-md">
          {/* Name */}
          <div className="space-y-sm">
            <Label>{t('organizations.settings.name')}</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-red">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Slug (read-only) */}
          <div className="space-y-sm">
            <Label>{t('organizations.settings.slug')}</Label>
            <Input value={org.slug} disabled className="font-mono opacity-60" />
            <p className="text-xs text-black/40">{t('organizations.settings.slugDescription')}</p>
          </div>

          <Separator />

          {/* Active Toggle */}
          <div className="flex items-start gap-sm">
            <input
              type="checkbox"
              id="is-active"
              {...form.register('is_active')}
              className="mt-0.5 size-4 rounded border-black/20"
            />
            <div>
              <Label htmlFor="is-active">{t('organizations.settings.isActive')}</Label>
              <p className="text-xs text-black/40">
                {t('organizations.settings.isActiveDescription')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-sm pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.reset({ name: org.name, is_active: org.is_active, logo_url: org.logo_url })
              }
            >
              {t('organizations.settings.reset')}
            </Button>
            <Button type="submit" variant="filled" disabled={updateOrg.isPending}>
              {updateOrg.isPending
                ? t('organizations.settings.saving')
                : t('organizations.settings.save')}
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone */}
      <Card padding="spacious" className="space-y-md border border-red/20 bg-red/5">
        <div>
          <h2 className="text-lg font-semibold text-red">
            {t('organizations.settings.dangerZone')}
          </h2>
          <p className="text-sm text-red/50">{t('organizations.settings.dangerZoneDescription')}</p>
        </div>
      </Card>

      {/* Image Cropper Dialog */}
      {imageToCrop && (
        <ImageCropperDialog
          open={cropperOpen}
          imageSrc={imageToCrop}
          onClose={handleCloseCropper}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          title={t('organizations.settings.cropLogo', 'Crop Organization Logo')}
        />
      )}
    </div>
  )
}
