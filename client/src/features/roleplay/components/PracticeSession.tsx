import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MessageSquareOff } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { practiceOverviewQuery } from '../queries/roleplay.queries'
import type { PracticeMode } from '../types'
import { ConversationView } from './ConversationView'
import { LoadError } from './LoadError'
import { SessionSetup } from './SessionSetup'

/** One practice run: setup, then the conversation. Feedback opens on its own page. */
export function PracticeSession({ scenarioKey }: { scenarioKey: string }) {
  const { data, isPending, isError, refetch } = useQuery(practiceOverviewQuery())
  const [choice, setChoice] = useState<{ mode: PracticeMode; enrolmentId: string } | null>(null)
  const scenario = data?.scenarios.find((s) => s.key === scenarioKey)

  const crumbs = [
    { label: 'AI practice', to: '/learner/practice' },
    { label: scenario?.title ?? 'Scenario' },
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
  if (isError) return <LoadError what="This scenario" onRetry={() => refetch()} />
  if (!scenario) {
    return (
      <EmptyState
        className="rounded-xl border bg-card"
        icon={MessageSquareOff}
        title="Scenario not found"
        description="This practice scenario does not exist. Choose one of the four sample scenarios."
        action={
          <Button asChild>
            <Link to="/learner/practice">Back to AI practice</Link>
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
        title="No programme to practise in"
        description="AI practice is part of Program A and Program B. Join a programme to start."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={crumbs}
        title={scenario.title}
        description={choice ? undefined : 'Read your goal, choose how to reply, then start.'}
        actions={choice ? undefined : <SimulatedTag label={data.label} />}
      />
      {choice ? (
        <ConversationView
          // A new choice starts a fresh conversation.
          key={`${choice.mode}-${choice.enrolmentId}`}
          scenario={scenario}
          mode={choice.mode}
          enrolmentId={choice.enrolmentId}
          label={data.label}
        />
      ) : (
        <SessionSetup scenario={scenario} enrolments={data.enrolments} onStart={setChoice} />
      )}
    </div>
  )
}
