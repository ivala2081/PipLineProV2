import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from '@phosphor-icons/react'
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
} from '@ds'
import { useToast } from '@/hooks/useToast'
import { useOrgInvitationsQuery } from '@/hooks/queries/useOrgInvitationsQuery'
import { useRevokeInvitation } from '@/hooks/queries/useOrgMemberMutations'
import { InviteMemberDialog } from '../InviteMemberDialog'
import { ConfirmDialog } from '../ConfirmDialog'

interface InvitationsTabProps {
  orgId: string
}

const statusVariant: Record<string, 'default' | 'green' | 'red'> = {
  pending: 'default',
  accepted: 'green',
  expired: 'red',
}

export function InvitationsTab({ orgId }: InvitationsTabProps) {
  const { t } = useTranslation('pages')
  const { toast } = useToast()
  const { data: invitations = [], isLoading } = useOrgInvitationsQuery(orgId)
  const revokeInvitation = useRevokeInvitation(orgId)

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string
    email: string
  } | null>(null)

  const handleRevoke = async () => {
    if (!revokeTarget) return
    try {
      await revokeInvitation.mutateAsync(revokeTarget.id)
      toast({
        title: t('organizations.toast.invitationRevoked'),
        variant: 'success',
      })
      setRevokeTarget(null)
    } catch (err) {
      toast({ title: (err as Error).message, variant: 'error' })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {t('organizations.invitations.title')}
            </h2>
            <p className="text-sm text-black/60">
              {t('organizations.invitations.subtitle')}
            </p>
          </div>
          <Button
            variant="filled"
            onClick={() => setInviteDialogOpen(true)}
          >
            <Plus size={16} weight="bold" />
            {t('organizations.invitations.invite')}
          </Button>
        </div>

        {invitations.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-black/60">
              {t('organizations.invitations.empty')}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-black/5 bg-bg1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('organizations.invitations.columns.email')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.role')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.status')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.createdAt')}
                  </TableHead>
                  <TableHead>
                    {t('organizations.invitations.columns.expiresAt')}
                  </TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Tag
                        variant={inv.role === 'admin' ? 'green' : 'blue'}
                      >
                        {inv.role === 'admin' ? 'Admin' : 'Operation'}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <Tag variant={statusVariant[inv.status] ?? 'default'}>
                        {t(
                          `organizations.invitations.statuses.${inv.status}`,
                        )}
                      </Tag>
                    </TableCell>
                    <TableCell className="text-sm text-black/60">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-black/60">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {inv.status === 'pending' && (
                        <Button
                          variant="borderless"
                          size="sm"
                          className="text-red-600"
                          onClick={() =>
                            setRevokeTarget({ id: inv.id, email: inv.email })
                          }
                        >
                          {t('organizations.invitations.revoke')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        orgId={orgId}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title={t('organizations.invitations.revokeConfirm.title')}
        description={t('organizations.invitations.revokeConfirm.description', {
          email: revokeTarget?.email ?? '',
        })}
        confirmLabel={t('organizations.invitations.revoke')}
        cancelLabel={t('organizations.createDialog.cancel')}
        destructive
      />
    </>
  )
}
