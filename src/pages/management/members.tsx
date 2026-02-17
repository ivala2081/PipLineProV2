import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DotsThree, Plus, Users } from '@phosphor-icons/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tag,
  Skeleton,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useToast } from '@/hooks/useToast'
import { useOrgMembersQuery, type MemberWithProfile } from '@/hooks/queries/useOrgMembersQuery'
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/queries/useOrgMemberMutations'
import { ConfirmDialog } from '@/pages/organizations/ConfirmDialog'
import { AddMemberDialog } from '@/pages/organizations/AddMemberDialog'
import { PinDialog } from '@/pages/transfers/PinDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { LastSeen } from '@/components/LastSeen'
import { usePresenceSubscription } from '@/hooks/usePresenceSubscription'

export function MembersPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('pages')
  const { toast } = useToast()
  const { user, isGod } = useAuth()
  const { currentOrg, membership } = useOrganization()

  const orgId = currentOrg?.id ?? ''
  const canManage = isGod || membership?.role === 'admin'

  const { data: members = [], isLoading } = useOrgMembersQuery(orgId)
  const updateRole = useUpdateMemberRole(orgId)
  const removeMember = useRemoveMember(orgId)

  const [pinTarget, setPinTarget] = useState<MemberWithProfile | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Subscribe to real-time presence updates
  usePresenceSubscription()

  const handleToggleRole = async (member: MemberWithProfile) => {
    const newRole = member.role === 'admin' ? 'operation' : 'admin'
    try {
      await updateRole.mutateAsync({ userId: member.user_id, role: newRole })
      toast({ title: t('organizations.toast.roleUpdated'), variant: 'success' })
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    try {
      await removeMember.mutateAsync(removeTarget.user_id)
      toast({ title: t('organizations.toast.memberRemoved'), variant: 'success' })
      setRemoveTarget(null)
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t('members.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('members.subtitle')}</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-black/10 bg-bg1 py-20">
          <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
            <Users size={20} className="text-black/30" />
          </div>
          <p className="text-sm text-black/60">{t('members.noOrg')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('members.title')}</h1>
          <p className="mt-1 text-sm text-black/60">{t('members.subtitle')}</p>
        </div>
        {canManage && (
          <Button variant="filled" onClick={() => setAddDialogOpen(true)}>
            <Plus size={16} weight="bold" />
            {t('members.addMember')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-xl border border-black/10">
          <div className="bg-black/[0.015] px-4 py-3">
            <Skeleton className="h-4 w-48 rounded-md" />
          </div>
          <div className="divide-y divide-black/[0.04]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="ml-auto h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-black/10 bg-bg1 py-20">
          <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
            <Users size={20} className="text-black/30" />
          </div>
          <p className="text-sm text-black/60">{t('organizations.members.empty')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-black/[0.015] hover:bg-black/[0.015]">
                <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-black/40">
                  {t('organizations.members.columns.name')}
                </TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-black/40">
                  {t('organizations.members.columns.status')}
                </TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-black/40">
                  {t('organizations.members.columns.role')}
                </TableHead>
                <TableHead className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-black/40">
                  {t('organizations.members.columns.joined')}
                </TableHead>
                {canManage && <TableHead className="h-10 w-12 px-2" />}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-black/[0.04]">
              {members.map((member) => {
                const isSelf = member.user_id === user?.id
                const displayName = member.profile?.display_name ?? member.user_id

                return (
                  <TableRow
                    key={member.user_id}
                    className="cursor-pointer hover:bg-black/[0.015]"
                    onClick={() => navigate(`/members/${member.user_id}`)}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={member.profile?.avatar_url}
                          name={member.profile?.display_name ?? undefined}
                          size="sm"
                          showPresence
                          lastSeenAt={member.profile?.last_seen_at}
                        />
                        <span className="text-sm font-medium text-black/90">{displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <LastSeen lastSeenAt={member.profile?.last_seen_at} />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Tag variant={member.role === 'admin' ? 'green' : 'blue'}>
                        {t(`memberProfile.roles.${member.role}`)}
                      </Tag>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-black/50">
                      {new Date(member.created_at).toLocaleDateString(
                        i18n.language === 'tr' ? 'tr-TR' : 'en-US',
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="px-2 py-3">
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="size-7 p-0 text-black/40 hover:text-black/70"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DotsThree size={16} weight="bold" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              sideOffset={4}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem onClick={() => handleToggleRole(member)}>
                                {member.role === 'admin'
                                  ? t('organizations.members.actions.demoteToOperation')
                                  : t('organizations.members.actions.promoteToAdmin')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red"
                                onClick={() => setPinTarget(member)}
                              >
                                {t('organizations.members.actions.remove')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Footer with count */}
          <div className="border-t border-black/10 bg-black/[0.015] px-4 py-2.5">
            <span className="text-xs text-black/40">
              {members.length} {t('members.totalMembers')}
            </span>
          </div>
        </div>
      )}

      <PinDialog
        open={!!pinTarget}
        onClose={() => setPinTarget(null)}
        onVerified={() => {
          setRemoveTarget(pinTarget)
          setPinTarget(null)
        }}
        securityPin="4561"
      />

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title={t('organizations.members.removeConfirm.title')}
        description={t('organizations.members.removeConfirm.description', {
          name: removeTarget?.profile?.display_name ?? removeTarget?.user_id ?? '',
        })}
        confirmLabel={t('organizations.members.actions.remove')}
        cancelLabel={t('organizations.createDialog.cancel')}
        destructive
      />

      {canManage && (
        <AddMemberDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          orgId={orgId}
        />
      )}
    </div>
  )
}
