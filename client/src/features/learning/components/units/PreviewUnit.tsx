import type { ProgrammeCode } from '@shared/constants'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePreviewViewed } from '../../queries/learning.queries'
import type { UnitContent } from '../../types'

type Content = Extract<UnitContent, { kind: 'preview' }>

/** C07 Program C sample overview and story-planning worksheet (illustrative only). */
export function PreviewUnit({
  content,
  programme,
  completed,
}: {
  content: Content
  programme: ProgrammeCode
  completed: boolean
}) {
  const viewed = usePreviewViewed()
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-white p-6 shadow-sm">
      <Badge variant="outline" className="border-maroon/30 text-maroon-deep">
        {content.preview.label}: illustrative programme
      </Badge>
      <h2 className="font-display text-2xl font-normal text-ink">Story-planning worksheet</h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {content.preview.steps.map((step, i) => (
          <li key={step} className="flex flex-col gap-2 rounded-xl bg-sand p-4">
            <span className="font-display text-3xl text-teal">{i + 1}</span>
            <span className="text-sm text-ink">{step}</span>
          </li>
        ))}
      </ol>
      {completed || viewed.isSuccess ? (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-teal">
          <CheckCircle2 aria-hidden className="size-4" /> Preview viewed
        </p>
      ) : (
        <Button
          className="self-start"
          disabled={viewed.isPending}
          onClick={() => viewed.mutate(programme)}
        >
          Mark as viewed
        </Button>
      )}
    </div>
  )
}
