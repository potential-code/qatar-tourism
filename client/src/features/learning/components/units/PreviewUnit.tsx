import type { ProgrammeCode } from '@shared/constants'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { tr } from '@/i18n/localised'
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
  const { t, i18n } = useTranslation('learner')
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-white p-6 shadow-sm">
      <Badge variant="outline" className="border-maroon/30 text-maroon-deep">
        {t('learning.preview.badge', { label: tr(content.preview.label, i18n.language) })}
      </Badge>
      <h2 className="font-display text-2xl font-normal text-ink">
        {t('learning.preview.worksheet')}
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {content.preview.steps.map((step, i) => (
          <li key={step} className="flex flex-col gap-2 rounded-xl bg-sand p-4">
            <span className="font-display text-3xl text-teal">{i + 1}</span>
            <span className="text-sm text-ink">{tr(step, i18n.language)}</span>
          </li>
        ))}
      </ol>
      {completed || viewed.isSuccess ? (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-teal">
          <CheckCircle2 aria-hidden className="size-4" /> {t('learning.preview.viewed')}
        </p>
      ) : (
        <Button
          className="self-start"
          disabled={viewed.isPending}
          onClick={() => viewed.mutate(programme)}
        >
          {t('learning.preview.markViewed')}
        </Button>
      )}
    </div>
  )
}
