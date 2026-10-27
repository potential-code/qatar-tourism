import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { formOptionsQuery, sessionDetailQuery } from '../../queries/trainer.queries'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'
import { SessionForm } from './SessionForm'

/** New session, or edit an existing one when `sessionId` is given. */
export function SessionFormPage({ sessionId }: { sessionId?: string }) {
  const options = useQuery(formOptionsQuery())
  const detail = useQuery({ ...sessionDetailQuery(sessionId ?? ''), enabled: Boolean(sessionId) })
  const title = sessionId ? 'Edit session' : 'Create a session'
  const header = (
    <PageHeader
      title={title}
      breadcrumbs={[{ label: 'My sessions', to: '/trainer/sessions' }, { label: title }]}
      description="Required fields follow the Academy session standard. Times are entered in Qatar time."
    />
  )
  if (options.isPending || (sessionId && detail.isPending))
    return (
      <>
        {header}
        <WorkspaceSkeleton rows={3} />
      </>
    )
  if (options.isError)
    return (
      <>
        {header}
        <QueryErrorPanel error={options.error} onRetry={() => options.refetch()} />
      </>
    )
  if (sessionId && detail.isError)
    return (
      <>
        {header}
        <QueryErrorPanel error={detail.error} onRetry={() => detail.refetch()} />
      </>
    )
  return (
    <>
      {header}
      <SessionForm options={options.data} session={detail.data?.session} />
    </>
  )
}
