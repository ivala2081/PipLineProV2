import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from '@phosphor-icons/react'
import { PageHeader, Button } from '@ds'
import { SectionErrorBoundary } from '@/components/ErrorBoundary'
import { useWalletsQuery } from '@/hooks/queries/useWalletsQuery'
import { WalletsTab } from '@/pages/accounting/WalletsTab'
import { WalletDialog } from '@/pages/accounting/WalletDialog'

export function WalletsPage() {
  const { t } = useTranslation('pages')
  const wallets = useWalletsQuery()
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)

  return (
    <div className="space-y-lg">
      <PageHeader
        title={t('wallets.title')}
        subtitle={t('wallets.subtitle')}
        actions={
          <Button variant="filled" onClick={() => setWalletDialogOpen(true)}>
            <Plus size={16} weight="bold" />
            {t('accounting.addWallet')}
          </Button>
        }
      />

      <SectionErrorBoundary sectionName="Wallets">
        <WalletsTab wallets={wallets} />
      </SectionErrorBoundary>

      <WalletDialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
        onSubmit={async (data) => {
          await wallets.createWallet(data)
          setWalletDialogOpen(false)
        }}
        isSubmitting={wallets.isCreating}
      />
    </div>
  )
}
