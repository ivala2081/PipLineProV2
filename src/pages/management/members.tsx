import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Crown, DotsThree, Plus, ShieldCheck, Users, Wrench } from '@phosphor-icons/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  PageHeader,
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
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { queryKeys } from '@/lib/queryKeys'
import { canManageMembers, getAssignableRoles } from '@/lib/roles'

type RoleKey = 'manager' | 'admin' | 'operation'

const ROLE_ORDER: RoleKey[] = ['admin', 'manager', 'operation']

const ROLE_CONFIG = {
  manager: { RoleIcon: Crown, dotClass: 'bg-purple-400' },
  admin: { RoleIcon: ShieldCheck, dotClass: 'bg-green-400' },
  operation: { RoleIcon: Wrench, dotClass: 'bg-blue-400' },
}

export function MembersPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('pages')
  const { toast } = useToast()
  const { user, isGod } = useAuth()
  const { currentOrg, membership } = useOrganization()

  const orgId = currentOrg?.id ?? ''
  const canManage = canManageMembers(membership?.role, isGod)
  const assignableRoles = getAssignableRoles(membership?.role, isGod)

  const { data: rawMembers = [], isLoading } = useOrgMembersQuery(orgId)

  useRealtimeSubscription('organization_members', [queryKeys.organizations.members(orgId)])

  const membersByRole = ROLE_ORDER.reduce(
    (acc, role) => {
      acc[role] = rawMembers.filter((m) => m.role === role)
      return acc
    },
    {} as Record<RoleKey, MemberWithProfile[]>,
  )
  const totalMembers = rawMembers.length

  const updateRole = useUpdateMemberRole(orgId)
  const removeMember = useRemoveMember(orgId)

  const [pinTarget, setPinTarget] = useState<MemberWithProfile | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  usePresenceSubscription()

  const handleChangeRole = async (
    member: MemberWithProfile,
    newRole: 'admin' | 'manager' | 'operation',
  ) => {
    if (member.role === newRole) return
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
      <div className="space-y-lg">
        <PageHeader title={t('members.title')} subtitle={t('members.subtitle')} />
        <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-black/10 bg-bg1 py-20">
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
      <PageHeader
        title={t('members.title')}
        subtitle={t('members.subtitle')}
        actions={
          canManage ? (
            <Button variant="filled" onClick={() => setAddDialogOpen(true)}>
              <Plus size={16} weight="bold" />
              {t('members.addMember')}
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        /* Skeleton matches 3-section layout */
        <div className="space-y-5">
          {([1, 2, 3] as const).map((rowCount, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-black/10">
              <div className="flex items-center gap-2.5 border-b border-black/10 bg-black/[0.015] px-4 py-2.5">
                <Skeleton className="size-2 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="ml-auto h-4 w-6 rounded-md" />
              </div>
              <div className="divide-y divide-black/[0.04]">
                {Array.from({ length: rowCount }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-3.5">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-28 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                    <Skeleton className="ml-auto h-3 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : totalMembers === 0 ? (
        <div className="flex flex-col items-center justify-center gap-sm rounded-xl border border-black/10 bg-bg1 py-20">
          <div className="flex size-12 items-center justify-center rounded-full bg-black/[0.04]">
            <Users size={20} className="text-black/30" />
          </div>
          <p className="text-sm text-black/60">{t('organizations.members.empty')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {ROLE_ORDER.map((role) => {
              const group = membersByRole[role]
              if (group.length === 0) return null
              const { RoleIcon, dotClass } = ROLE_CONFIG[role]

              return (
                <div key={role} className="overflow-hidden rounded-xl border border-black/10">
                  {/* Role section header */}
                  <div className="flex items-center gap-2.5 border-b border-black/10 bg-black/[0.015] px-4 py-2.5">
                    <span className={`size-2 shrink-0 rounded-full ${dotClass}`} />
                    <RoleIcon size={13} weight="bold" className="text-black/40" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-black/50">
                      {t(`memberProfile.roles.${role}`)}
                    </span>
                    <span className="ml-auto rounded-md bg-black/[0.06] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-black/40">
                      {group.length}
                    </span>
                  </div>

                  <Table cardOnMobile className="table-fixed">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="h-9 px-4 text-xs font-medium text-black/30">
                          {t('organizations.members.columns.name')}
                        </TableHead>
                        <TableHead className="h-9 w-52 px-4 text-xs font-medium text-black/30">
                          {t('organizations.members.columns.status')}
                        </TableHead>
                        <TableHead className="h-9 w-36 px-4 text-xs font-medium text-black/30">
                          {t('organizations.members.columns.joined')}
                        </TableHead>
                        {canManage && <TableHead className="h-9 w-12 px-2" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-black/[0.04]">
                      {group.map((member) => {
                        const isSelf = member.user_id === user?.id
                        const canActOnMember =
                          !isSelf &&
                          (isGod || membership?.role !== 'manager' || member.role !== 'admin')
                        const displayName = member.profile?.display_name ?? member.user_id

                        return (
                          <TableRow
                            key={member.user_id}
                            className="cursor-pointer hover:bg-black/[0.015]"
                            onClick={() => navigate(`/members/${member.user_id}`)}
                          >
                            <TableCell
                              className="px-4 py-3"
                              data-label={t('organizations.members.columns.name')}
                            >
                              <div className="flex items-center gap-sm">
                                <UserAvatar
                                  src={member.profile?.avatar_url}
                                  name={member.profile?.display_name ?? undefined}
                                  role={member.role}
                                  size="sm"
                                  showPresence
                                  lastSeenAt={member.profile?.last_seen_at}
                                />
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm font-medium text-black/90">
                                    {displayName}
                                  </span>
                                  {isSelf && <span className="text-xs text-black/30">· You</span>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell
                              className="px-4 py-3"
                              data-label={t('organizations.members.columns.status')}
                            >
                              <LastSeen lastSeenAt={member.profile?.last_seen_at} />
                            </TableCell>
                            <TableCell
                              className="px-4 py-3 text-sm text-black/40"
                              data-label={t('organizations.members.columns.joined')}
                            >
                              {new Date(member.created_at).toLocaleDateString(
                                i18n.language === 'tr' ? 'tr-TR' : 'en-US',
                              )}
                            </TableCell>
                            {canManage && (
                              <TableCell className="px-2 py-3" isActions>
                                {canActOnMember && (
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
                                      {assignableRoles.includes('admin') &&
                                        member.role !== 'admin' && (
                                          <DropdownMenuItem
                                            onClick={() => handleChangeRole(member, 'admin')}
                                          >
                                            {t('organizations.members.actions.makeAdmin')}
                                          </DropdownMenuItem>
                                        )}
                                      {assignableRoles.includes('manager') &&
                                        member.role !== 'manager' && (
                                          <DropdownMenuItem
                                            onClick={() => handleChangeRole(member, 'manager')}
                                          >
                                            {t('organizations.members.actions.makeManager')}
                                          </DropdownMenuItem>
                                        )}
                                      {assignableRoles.includes('operation') &&
                                        member.role !== 'operation' && (
                                          <DropdownMenuItem
                                            onClick={() => handleChangeRole(member, 'operation')}
                                          >
                                            {t('organizations.members.actions.makeOperation')}
                                          </DropdownMenuItem>
                                        )}
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
                </div>
              )
            })}
          </div>

          {/* Total count */}
          <p className="text-center text-xs text-black/30">
            {totalMembers} {t('members.totalMembers')}
          </p>
        </>
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
          assignableRoles={assignableRoles}
        />
      )}
    </div>
  )
}
