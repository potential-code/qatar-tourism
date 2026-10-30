import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MessageSquareOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { tr } from '@/i18n/localised'
import { practiceOverviewQuery } from '../queries/roleplay.queries'
import type { PracticeMode } from '../types'
import { ConversationView } from './ConversationView'
import { LoadError } from './LoadError'
import { SessionSetup } from './SessionSetup'

/** One practice run: setup, then the conversation. Feedback opens on its own page. */
export function PracticeSession({ scenarioKey }: { scenarioKey: string }) {
  const { t, i18n } = useTranslation('learner')
  const { data, isPending, isError, refetch } = useQuery(practiceOverviewQuery())
  const [choice, setChoice] = useState<{ mode: PracticeMode; enrolmentId: string } | null>(null)
  const scenario = data?.scenarios.find((s) => s.key === scenarioKey)

  const crumbs = [
    { label: t('roleplay.overview.crumb'), to: '/learner/practice' },
    { label: scenario ? tr(scenario.title, i18n.language) : t('roleplay.session.scenarioCrumb') },
  ]

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-72" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }
  if (isError) return <LoadError what={t('roleplay.session.loadWhat')} onRetry={() => refetch()} />
  if (!scenario) {
    return (
      <EmptyState
        className="rounded-xl border bg-card"
        icon={MessageSquareOff}
        title={t('roleplay.session.notFoundTitle')}
        description={t('roleplay.session.notFoundDescription')}
        action={
          <Button asChild>
            <Link to="/learner/practice">{t('roleplay.session.back')}</Link>
          </Button>
        }
      />
    )
  }
  if (data.enrolments.length === 0) {
    return (
      <EmptyState
        className="rounded-xl border bg-card"
        icon={MessageSquareOff}
        title={t('roleplay.session.noProgrammeTitle')}
        description={t('roleplay.session.noProgrammeDescription')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={crumbs}
        title={tr(scenario.title, i18n.language)}
        description={choice ? undefined : t('roleplay.session.intro')}
        actions={choice ? undefined : <SimulatedTag label={tr(data.label, i18n.language)} />}
      />
      {choice ? (
        <ConversationView
          // A new choice starts a fresh conversation.
          key={`${choice.mode}-${choice.enrolmentId}`}
          scenario={scenario}
          mode={choice.mode}
          enrolmentId={choice.enrolmentId}
          label={tr(data.label, i18n.language)}
        />
      ) : (
        <SessionSetup scenario={scenario} enrolments={data.enrolments} onStart={setChoice} />
      )}
    </div>
  )
}
