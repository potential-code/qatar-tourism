import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadError } from '@/features/learning/components/LoadError'
import { myRecordQuery } from '../queries/record.queries'
import { CertificatesTab } from './CertificatesTab'
import { ExternalTab } from './ExternalTab'
import { HistoryTab } from './HistoryTab'

type TabKey = 'history' | 'certificates' | 'external'

/**
 * My Learning Record (SPEC §4): one record across programmes. Training History, Certificates and
 * CPD (with the CPD ledger), and External Certificates. Bilingual (`record` namespace).
 */
export function LearnerRecordPage() {
  const { t } = useTranslation('record')
  const query = useQuery(myRecordQuery())
  const [tab, setTab] = useState<TabKey>('history')

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('page.title')}
        description={
          query.data
            ? t('page.descriptionWithId', {
                id: query.data.learner.displayId,
                n: query.data.programmes.length,
              })
            : t('page.description')
        }
      />
      {query.isPending ? (
        <div className="grid gap-4" role="status" aria-label={t('common.loading')}>
          <Skeleton className="h-10 w-96 max-w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : query.isError ? (
        <LoadError
          error={query.error}
          onRetry={() => void query.refetch()}
          title={t('common.loadError')}
        />
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)} className="gap-6">
          <TabsList className="h-auto w-full max-w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="history">{t('tabs.history')}</TabsTrigger>
            <TabsTrigger value="certificates">{t('tabs.certificates')}</TabsTrigger>
            <TabsTrigger value="external">{t('tabs.external')}</TabsTrigger>
          </TabsList>
          <TabsContent value="history">
            <HistoryTab rows={query.data.history} />
          </TabsContent>
          <TabsContent value="certificates">
            <CertificatesTab record={query.data} />
          </TabsContent>
          <TabsContent value="external">
            <ExternalTab record={query.data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
