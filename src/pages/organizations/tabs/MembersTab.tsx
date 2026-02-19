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
  EmptyState,
} from '@ds'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/useToast'
import { useOrgMembersQuery, type MemberWithProfile } from '@/hooks/queries/useOrgMembersQuery'
import { useUpdateMemberRole, useRemoveMember } from '@/hooks/queries/useOrgMemberMutations'
import { ConfirmDialog } from '../ConfirmDialog'
import { AddMemberDialog } from '../AddMemberDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { LastSeen } from '@/components/LastSeen'
import { usePresenceSubscription } from '@/hooks/usePresenceSubscription'

interface MembersTabProps {
  orgId: string
  canManage: boolean
}

export function MembersTab({ orgId, canManage }: MembersTabProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { user } = useAuth()
  const { data: members = [], isLoading } = useOrgMembersQuery(orgId)
  const updateRole = useUpdateMemberRole(orgId)
  const removeMember = useRemoveMember(orgId)

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

  if (isLoading) {
    return (
      <div className="space-y-sm pt-md">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-md pt-md">
        {canManage && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('organizations.members.title')}</h2>
              <p className="text-sm text-black/60">{t('organizations.members.subtitle')}</p>
            </div>
            <Button variant="filled" onClick={() => setAddDialogOpen(true)}>
              <Plus size={16} weight="bold" />
              {t('organizations.members.addMember')}
            </Button>
          </div>
        )}

        {members.length === 0 ? (
          <EmptyState icon={Users} title={t('organizations.members.empty')} />
        ) : (
          <div className="rounded-lg border border-black/5 bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('organizations.members.columns.name')}</TableHead>
                  <TableHead>{t('organizations.members.columns.status')}</TableHead>
                  <TableHead>{t('organizations.members.columns.role')}</TableHead>
                  <TableHead>{t('organizations.members.columns.joined')}</TableHead>
                  {canManage && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelf = member.user_id === user?.id
                  const displayName = member.profile?.display_name ?? member.user_id

                  return (
                    <TableRow
                      key={member.user_id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/members/${member.user_id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-sm">
                          <UserAvatar
                            src={member.profile?.avatar_url}
                            name={member.profile?.display_name ?? undefined}
                            size="sm"
                            showPresence
                            lastSeenAt={member.profile?.last_seen_at}
                          />
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LastSeen lastSeenAt={member.profile?.last_seen_at} />
                      </TableCell>
                      <TableCell>
                        <Tag variant={member.role === 'admin' ? 'green' : 'blue'}>
                          {member.role === 'admin' ? 'Admin' : 'Operation'}
                        </Tag>
                      </TableCell>
                      <TableCell className="text-sm text-black/60">
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          {!isSelf && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="borderless"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DotsThree size={18} weight="bold" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleToggleRole(member)}>
                                  {member.role === 'admin'
                                    ? t('organizations.members.actions.demoteToOperation')
                                    : t('organizations.members.actions.promoteToAdmin')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red"
                                  onClick={() => setRemoveTarget(member)}
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
        )}
      </div>

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
    </>
  )
}
