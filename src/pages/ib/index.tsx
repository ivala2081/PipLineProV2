import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from '@phosphor-icons/react'
import { PageHeader, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@ds'
import { useOrganization } from '@/app/providers/OrganizationProvider'
import { useAuth } from '@/app/providers/AuthProvider'
import { SectionErrorBoundary } from '@/components/ErrorBoundary'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { queryKeys } from '@/lib/queryKeys'
import { PartnersTab } from './PartnersTab'
import { ReferralsTab } from './ReferralsTab'
import { CommissionsTab } from './CommissionsTab'
import { PaymentsTab } from './PaymentsTab'
import { PartnerDetailPanel } from './PartnerDetailPanel'

type IBTab = 'partners' | 'referrals' | 'commissions' | 'payments'

export function IBPage() {
  const { t } = useTranslation('pages')
  const { partnerId } = useParams<{ partnerId: string }>()
  const navigate = useNavigate()
  const { isGod } = useAuth()
  const { membership } = useOrganization()
  const isAdmin = isGod || membership?.role === 'admin'

  const [activeTab, setActiveTab] = useState<IBTab>('partners')
  const [showPartnerDialog, setShowPartnerDialog] = useState(false)
  const [showReferralDialog, setShowReferralDialog] = useState(false)
  const [showCalculateDialog, setShowCalculateDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  // Realtime subscriptions
  useRealtimeSubscription('ib_partners', [queryKeys.ib.all])
  useRealtimeSubscription('ib_referrals', [queryKeys.ib.all])
  useRealtimeSubscription('ib_commissions', [queryKeys.ib.all])
  useRealtimeSubscription('ib_payments', [queryKeys.ib.all])

  // If partner detail route
  if (partnerId) {
    return (
      <PartnerDetailPanel partnerId={partnerId} isAdmin={isAdmin} onBack={() => navigate('/ib')} />
    )
  }

  const headerAction = isAdmin ? (
    <>
      {activeTab === 'partners' && (
        <Button variant="filled" size="sm" onClick={() => setShowPartnerDialog(true)}>
          <Plus size={14} weight="bold" />
          {t('ib.partners.add')}
        </Button>
      )}
      {activeTab === 'referrals' && (
        <Button variant="filled" size="sm" onClick={() => setShowReferralDialog(true)}>
          <Plus size={14} weight="bold" />
          {t('ib.referrals.add')}
        </Button>
      )}
      {activeTab === 'commissions' && (
        <Button variant="filled" size="sm" onClick={() => setShowCalculateDialog(true)}>
          {t('ib.commissions.calculate')}
        </Button>
      )}
      {activeTab === 'payments' && (
        <Button variant="filled" size="sm" onClick={() => setShowPaymentDialog(true)}>
          <Plus size={14} weight="bold" />
          {t('ib.payments.create')}
        </Button>
      )}
    </>
  ) : null

  return (
    <div className="space-y-lg">
      <PageHeader title={t('ib.title')} subtitle={t('ib.subtitle')} actions={headerAction} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as IBTab)}>
        <TabsList>
          <TabsTrigger value="partners">{t('ib.tabs.partners')}</TabsTrigger>
          <TabsTrigger value="referrals">{t('ib.tabs.referrals')}</TabsTrigger>
          <TabsTrigger value="commissions">{t('ib.tabs.commissions')}</TabsTrigger>
          <TabsTrigger value="payments">{t('ib.tabs.payments')}</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <SectionErrorBoundary sectionName="IB Partners">
            <PartnersTab
              isAdmin={isAdmin}
              showDialog={showPartnerDialog}
              onShowDialog={setShowPartnerDialog}
            />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="referrals">
          <SectionErrorBoundary sectionName="IB Referrals">
            <ReferralsTab
              isAdmin={isAdmin}
              showDialog={showReferralDialog}
              onShowDialog={setShowReferralDialog}
            />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="commissions">
          <SectionErrorBoundary sectionName="IB Commissions">
            <CommissionsTab
              isAdmin={isAdmin}
              showCalculateDialog={showCalculateDialog}
              onShowCalculateDialog={setShowCalculateDialog}
            />
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="payments">
          <SectionErrorBoundary sectionName="IB Payments">
            <PaymentsTab
              isAdmin={isAdmin}
              showDialog={showPaymentDialog}
              onShowDialog={setShowPaymentDialog}
            />
          </SectionErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}
