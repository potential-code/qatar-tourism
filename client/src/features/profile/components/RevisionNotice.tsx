import { Route as RouteIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { type PathRevision, useAcceptRevision } from '../queries/profile.queries'

/**
 * Offers the revised recommended path after a role or organisation change (brief §4). Nothing
 * moves until the learner accepts, and completed work is never deleted.
 */
export function RevisionNotice({ revisions }: { revisions: PathRevision[] }) {
  const accept = useAcceptRevision()
  const [kept, setKept] = useState<string[]>([])
  const visible = revisions.filter((r) => !kept.includes(r.enrolmentId))
  if (visible.length === 0) return null
  return (
    <div className="grid gap-3" aria-live="polite">
      {visible.map((revision) => (
        <section
          key={revision.enrolmentId}
          aria-label={`Revised path for Program ${revision.programme}`}
          className="grid gap-4 rounded-xl border border-teal/25 bg-teal-mist p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
        >
          <RouteIcon aria-hidden className="size-6 text-teal" />
          <div className="grid gap-1 text-sm">
            <p className="font-medium text-teal-deep">
              A revised path is recommended for Program {revision.programme}
            </p>
            <p>
              Your updated profile matches <strong>{revision.suggestedPath}</strong>
              {revision.currentPath ? ` instead of ${revision.currentPath}` : ''}. Units you have
              completed stay complete.
            </p>
            <p className="text-muted-foreground text-xs">{revision.reason}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={accept.isPending}
              onClick={async () => {
                try {
                  await accept.mutateAsync(revision.programme)
                  toast.success(
                    `Program ${revision.programme} now follows ${revision.suggestedPath}.`,
                  )
                } catch {
                  toast.error('The path could not be changed. Try again.')
                }
              }}
            >
              Switch to this path
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setKept((k) => [...k, revision.enrolmentId])}
            >
              Keep my current path
            </Button>
          </div>
        </section>
      ))}
    </div>
  )
}
