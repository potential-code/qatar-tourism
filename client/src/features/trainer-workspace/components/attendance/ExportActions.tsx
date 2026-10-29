import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import { Download, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'
import { useSessionExport } from '../../queries/exports.queries'

/**
 * Exports (brief §11). Marks: learner ID and score only, allowed. Personal data: the button is
 * shown on purpose so the demo can prove the service blocks it and records the attempt.
 */
export function ExportActions({ sessionId }: { sessionId: string }) {
  const exporter = useSessionExport()
  const [blocked, setBlocked] = useState<string | null>(null)

  async function run(kind: 'marks' | 'personal') {
    setBlocked(null)
    try {
      const { rows, name } = await exporter.mutateAsync({ sessionId, kind })
      toast.success(`Exported ${rows} rows to ${name}. The export was recorded in the audit log.`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403)
        setBlocked(err.message || EXPORT_BLOCKED_MESSAGE)
      else toast.error(err instanceof ApiError ? err.message : 'The export failed. Try again.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => run('marks')}
          disabled={exporter.isPending}
        >
          <Download aria-hidden /> Export marks (learner ID and score)
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => run('personal')}
          disabled={exporter.isPending}
        >
          <Download aria-hidden /> Export personal data
        </Button>
      </div>
      {blocked ? (
        <p
          role="alert"
          className="flex gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {blocked}
            <span className="block text-xs text-destructive/80">
              This attempt was recorded in the audit log as denied.
            </span>
          </span>
        </p>
      ) : null}
    </div>
  )
}
