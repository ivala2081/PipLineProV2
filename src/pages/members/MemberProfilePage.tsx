import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  PencilSimple,
  Phone,
  Buildings,
  CalendarBlank,
  Briefcase,
  ShieldCheck,
  Info,
} from '@phosphor-icons/react'
import {
  Card,
  Tag,
  Separator,
  Button,
  Skeleton,
  EmptyState,
} from '@ds'
import { useLocale } from '@ds/hooks'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useToast } from '@/hooks/useToast'
import {
  useProfileQuery,
  type ProfileWithMemberships,
} from '@/hooks/queries/useProfileQuery'
import { useUpdateProfileMutation } from '@/hooks/queries/useUpdateProfileMutation'
import { AvatarUpload } from '@/components/AvatarUpload'
import { EditProfileDialog, type ProfileFormData } from './EditProfileDialog'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function MemberProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { locale } = useLocale()
  const { toast } = useToast()
  const { user, isGod, refreshProfile } = useAuth()
  const { currentOrg, membership } = useOrganization()

  const {
    data: profileData,
    isLoading,
    isError,
  } = useProfileQuery(userId ?? '')
  const updateProfile = useUpdateProfileMutation(userId ?? '')

  const isSelf = user?.id === userId
  const isAdminOfSharedOrg =
    !isGod &&
    membership?.role === 'admin' &&
    !!profileData?.memberships.some(
      (m) => m.organization_id === currentOrg?.id,
    )
  const canEdit = isGod || isAdminOfSharedOrg || isSelf
  const canEditAdminFields = isGod || isAdminOfSharedOrg

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const formDataFromProfile = (): ProfileFormData => ({
    display_name: profileData?.display_name ?? '',
    phone: profileData?.phone ?? '',
    bio: profileData?.bio ?? '',
    department: profileData?.department ?? '',
    notes: profileData?.notes ?? '',
  })

  const localeTag = locale === 'tr' ? 'tr-TR' : 'en-US'

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const handleSave = async (formData: ProfileFormData) => {
    const payload: Record<string, string | null> = {
      display_name: formData.display_name || null,
      phone: formData.phone || null,
      bio: formData.bio || null,
    }

    if (canEditAdminFields) {
      payload.department = formData.department || null
      payload.notes = formData.notes || null
    }

    try {
      await updateProfile.mutateAsync(payload)
      toast({ title: t('memberProfile.toast.updated'), variant: 'success' })
      setIsDialogOpen(false)
      if (isSelf) await refreshProfile()
    } catch {
      toast({ title: t('memberProfile.toast.error'), variant: 'error' })
    }
  }

  const handleAvatarUpload = (url: string) => {
    // Refetch profile to get updated avatar
    toast({ title: 'Profile picture updated successfully', variant: 'success' })
    if (isSelf) refreshProfile()
  }

  const handleAvatarRemove = () => {
    toast({ title: 'Profile picture removed', variant: 'success' })
    if (isSelf) refreshProfile()
  }

  /* ----- Loading ----- */
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-32" />

        {/* Hero skeleton */}
        <div className="relative">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="absolute -bottom-16 left-8">
            <Skeleton className="size-32 rounded-3xl border-4 border-bg1" />
          </div>
        </div>

        <div className="pt-16 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  /* ----- Not Found ----- */
  if (isError || !profileData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <EmptyState
          icon={User}
          title={t('memberProfile.notFound')}
          description={t('memberProfile.notFoundDescription')}
          action={
            <Button variant="outline" onClick={() => navigate('/members')}>
              <ArrowLeft size={16} />
              {t('memberProfile.backToMembers')}
            </Button>
          }
        />
      </div>
    )
  }

  const displayName = profileData.display_name ?? userId ?? ''
  const roles = profileData.memberships.map((m) => ({
    role: m.role,
    orgName: m.organization.name,
    orgId: m.organization_id,
  }))

  return (
    <div className="space-y-8 pb-12">
      {/* Back button */}
      <Button variant="gray" size="sm" onClick={() => navigate('/members')}>
        <ArrowLeft size={16} />
        {t('memberProfile.backToMembers')}
      </Button>

      {/* Hero Section with Cover */}
      <div className="relative -mx-6 sm:-mx-0">
        {/* Cover area */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-black/[0.02] via-black/[0.01] to-transparent">
          {/* Geometric pattern */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, currentColor 35px, currentColor 36px)`,
          }} />

          {/* Edit button - floating on cover */}
          {canEdit && (
            <div className="absolute right-6 top-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
              >
                <PencilSimple size={16} weight="bold" />
                {t('memberProfile.edit')}
              </Button>
            </div>
          )}
        </div>

        {/* Profile content overlapping cover */}
        <div className="relative px-6 sm:px-8">
          {/* Avatar - overlapping cover */}
          <div className="relative -mt-20 mb-6">
            <AvatarUpload
              userId={userId!}
              currentAvatarUrl={profileData.avatar_url}
              fallbackText={getInitials(profileData.display_name)}
              onUploadSuccess={handleAvatarUpload}
              onRemoveSuccess={handleAvatarRemove}
              size="xl"
              editable={canEdit}
            />

            {/* Status indicator */}
            <div className="absolute bottom-2 right-14 size-6 rounded-full border-[3px] border-bg1 bg-green shadow-sm" />
          </div>

          {/* Name and basic info */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-black/90">
              {displayName}
            </h1>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-black/60">
              <div className="flex items-center gap-2">
                <CalendarBlank size={16} />
                <span>
                  {t('memberProfile.fields.memberSince')} {formatDate(profileData.created_at)}
                </span>
              </div>

              {profileData.department && (
                <>
                  <span className="text-black/20">|</span>
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} />
                    <span>{profileData.department}</span>
                  </div>
                </>
              )}
            </div>

            {/* Roles */}
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <div
                  key={r.orgId}
                  className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5"
                >
                  <div className={`size-1.5 rounded-full ${r.role === 'admin' ? 'bg-green' : 'bg-blue'}`} />
                  <span className="text-xs font-medium text-black/70">
                    {r.role === 'admin' ? 'Admin' : 'Operation'}
                  </span>
                  <span className="text-xs text-black/40">·</span>
                  <span className="text-xs text-black/60">{r.orgName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Primary Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Information */}
          <div className="group relative overflow-hidden rounded-xl border border-black/[0.08] bg-white">
            <div className="border-b border-black/[0.06] bg-black/[0.01] px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50">
                {t('memberProfile.sections.contactInfo')}
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/[0.02]">
                  <Phone size={18} className="text-black/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-black/40 mb-1">
                    {t('memberProfile.fields.phone')}
                  </label>
                  <p className={`text-sm ${profileData.phone ? 'text-black/90' : 'text-black/30 italic'}`}>
                    {profileData.phone || t('memberProfile.fields.noPhone')}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Department */}
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/[0.02]">
                  <Briefcase size={18} className="text-black/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-black/40 mb-1">
                    {t('memberProfile.fields.department')}
                  </label>
                  <p className={`text-sm ${profileData.department ? 'text-black/90' : 'text-black/30 italic'}`}>
                    {profileData.department || t('memberProfile.fields.noDepartment')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="group relative overflow-hidden rounded-xl border border-black/[0.08] bg-white">
            <div className="border-b border-black/[0.06] bg-black/[0.01] px-6 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50">
                {t('memberProfile.sections.bio')}
              </h2>
            </div>
            <div className="p-6">
              <p
                className={`whitespace-pre-wrap text-sm leading-relaxed ${
                  profileData.bio ? 'text-black/70' : 'text-black/30 italic'
                }`}
              >
                {profileData.bio || t('memberProfile.fields.noBio')}
              </p>
            </div>
          </div>

          {/* Internal Notes - Admin Only */}
          {(canEditAdminFields || profileData.notes) && (
            <div className="group relative overflow-hidden rounded-xl border-2 border-dashed border-black/[0.12] bg-black/[0.01]">
              <div className="border-b border-black/[0.08] bg-black/[0.02] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-black/40" weight="fill" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50">
                      {t('memberProfile.sections.notes')}
                    </h2>
                  </div>
                  <span className="text-xs text-black/40">
                    {t('memberProfile.notesHint')}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <p
                  className={`whitespace-pre-wrap text-sm leading-relaxed ${
                    profileData.notes
                      ? 'text-black/70'
                      : 'text-black/30 italic'
                  }`}
                >
                  {profileData.notes || t('memberProfile.fields.noNotes')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Organizations */}
        <div className="space-y-6">
          <div className="sticky top-6 space-y-6">
            {/* Organizations */}
            {profileData.memberships.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
                <div className="border-b border-black/[0.06] bg-black/[0.01] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50">
                      {t('memberProfile.sections.organizations')}
                    </h2>
                    <span className="flex size-6 items-center justify-center rounded-md bg-black/5 text-xs font-bold text-black/50">
                      {profileData.memberships.length}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-black/[0.04]">
                  {profileData.memberships.map((m) => (
                    <button
                      key={m.organization_id}
                      onClick={() => navigate(`/organizations/${m.organization_id}`)}
                      className="group flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-black/[0.01]"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-black/[0.06] bg-black/[0.01] transition-colors group-hover:border-brand group-hover:bg-brand/5">
                        <Buildings size={18} className="text-black/40 transition-colors group-hover:text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-black/90 transition-colors group-hover:text-brand">
                          {m.organization.name}
                        </p>
                        <p className="truncate text-xs text-black/40">
                          {m.organization.slug}
                        </p>
                      </div>
                      <Tag
                        variant={m.role === 'admin' ? 'green' : 'blue'}
                        className="shrink-0"
                      >
                        {m.role === 'admin' ? 'Admin' : 'Operation'}
                      </Tag>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="rounded-xl border border-black/[0.08] bg-gradient-to-br from-blue/[0.02] to-transparent p-6">
              <div className="mb-3 flex items-center gap-2 text-blue">
                <Info size={18} weight="fill" />
                <h3 className="text-sm font-semibold">Profile Information</h3>
              </div>
              <p className="text-xs leading-relaxed text-black/50">
                {isSelf
                  ? "This is your personal profile. You can edit your contact information and bio."
                  : canEdit
                    ? "You have permission to edit this member's profile information."
                    : "You are viewing this member's profile in read-only mode."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        initialData={formDataFromProfile()}
        canEditAdminFields={canEditAdminFields}
        isSaving={updateProfile.isPending}
      />
    </div>
  )
}
