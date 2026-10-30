import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { qatarDateTime } from '@/lib/format/qatar-time'
import type { StatementView } from '@/services/xapi.service'

/** A compact summary of an xAPI result object: response, success, score. */
export function resultSummary(result: Record<string, unknown> | null): string {
  if (!result) return '-'
  const parts: string[] = []
  if (typeof result.response === 'string') parts.push(result.response)
  if (result.completion === true) parts.push('completed')
  if (result.success === true) parts.push('success')
  if (result.success === false) parts.push('not successful')
  const score = result.score as { scaled?: number } | undefined
  if (typeof score?.scaled === 'number') parts.push(`score ${Math.round(score.scaled * 100)}%`)
  return parts.length > 0 ? parts.join(', ') : '-'
}

/**
 * The simulated learning record store as a table: actor, verb, activity, timestamp, result.
 * Statements are labelled simulated by the caller. Learners see their own rows; the admin
 * tracking test shows the actor column too.
 */
export function StatementsTable({
  items,
  showActor = false,
  learner = false,
}: {
  items: StatementView[]
  showActor?: boolean
  /** Use the learner-portal (translated) headings and empty message. */
  learner?: boolean
}) {
  const { t } = useTranslation('content')
  const head = (key: 'colVerb' | 'colActivity' | 'colTime' | 'colResult', english: string) =>
    learner ? t(`player.${key}`) : english
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {learner
          ? t('player.noStatements')
          : 'No statements yet. Launch the activity to create some.'}
      </p>
    )
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showActor ? <TableHead>Actor</TableHead> : null}
            <TableHead>{head('colVerb', 'Verb')}</TableHead>
            <TableHead>{head('colActivity', 'Activity')}</TableHead>
            <TableHead>{head('colTime', 'Timestamp')}</TableHead>
            <TableHead>{head('colResult', 'Result')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row.id}>
              {showActor ? (
                <TableCell className="whitespace-nowrap">
                  <span className="font-medium text-ink">{row.actorName}</span>
                  <span className="block text-xs text-muted-foreground" dir="ltr">
                    {row.actorAccount}
                  </span>
                </TableCell>
              ) : null}
              <TableCell className="font-medium text-ink" dir="ltr">
                {row.verb}
              </TableCell>
              <TableCell
                className="max-w-[16rem] truncate text-xs"
                dir="ltr"
                title={row.activityId}
              >
                {row.activity}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs" dir="ltr">
                {qatarDateTime(row.timestamp, { label: false })}
              </TableCell>
              <TableCell className="text-xs">{resultSummary(row.result)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
