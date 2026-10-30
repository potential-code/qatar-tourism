import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { tr } from '@/i18n/localised'
import { ApiError } from '@/lib/api-error'
import { useSaveResource } from '../../queries/learning.queries'
import type { UnitContent } from '../../types'

type Content = Extract<UnitContent, { kind: 'resource' }>

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

/**
 * C05 one-page checklist and written response (brief §7). Program B submits a 100 to 150 word
 * response in Assignments; Program A develops a plan here that feeds the practical assignment.
 */
export function ResourceUnit({
  content,
  programme,
  completed,
}: {
  content: Content
  programme: ProgrammeCode
  completed: boolean
}) {
  const { t, i18n } = useTranslation('learner')
  const [checked, setChecked] = useState<string[]>(
    content.saved.checklist.length > 0 || !completed
      ? content.saved.checklist
      : content.checklist.map((item) => item.key),
  )
  const [draft, setDraft] = useState(content.saved.draft)
  const save = useSaveResource()
  const count = words(draft)
  const allTicked = checked.length === content.checklist.length

  const submit = (markComplete: boolean) =>
    save.mutate(
      { programme, checklist: checked, draft, markComplete },
      {
        onSuccess: (r) =>
          toast.success(
            r.completedNow ? t('learning.resource.unitComplete') : t('learning.resource.saved'),
          ),
        onError: (e) =>
          toast.error(e instanceof ApiError ? e.message : t('learning.resource.saveError')),
      },
    )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section
        aria-labelledby="checklist-title"
        className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm"
      >
        <h2 id="checklist-title" className="font-display text-2xl font-normal text-ink">
          {t('learning.resource.checklistTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('learning.resource.checklistIntro')}</p>
        <ul className="flex flex-col gap-3">
          {content.checklist.map((item, index) => {
            const id = `c05-${item.key}`
            return (
              <li key={item.key} className="flex items-start gap-3 rounded-lg bg-sand p-3">
                <Checkbox
                  id={id}
                  checked={checked.includes(item.key)}
                  onCheckedChange={(value) =>
                    setChecked((prev) =>
                      value
                        ? [...new Set([...prev, item.key])]
                        : prev.filter((k) => k !== item.key),
                    )
                  }
                  className="mt-0.5"
                />
                <Label htmlFor={id} className="block font-normal leading-relaxed text-ink">
                  <span className="me-1 font-display text-teal">{index + 1}.</span>{' '}
                  {tr(item.label, i18n.language)}
                </Label>
              </li>
            )
          })}
        </ul>
      </section>
      <section
        aria-labelledby="exercise-title"
        className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm"
      >
        <h2 id="exercise-title" className="font-display text-2xl font-normal text-ink">
          {programme === 'A'
            ? t('learning.resource.draftTitleA')
            : t('learning.resource.draftTitleB')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('learning.resource.exerciseIntro')}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="c05-draft">{t('learning.resource.notes')}</Label>
          <Textarea
            id="c05-draft"
            rows={8}
            className="min-h-48"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={completed && programme === 'A'}
          />
          <p className="text-xs text-muted-foreground">
            {t('learning.resource.words', { n: count })}
            {programme === 'A'
              ? t('learning.resource.minWords', { n: content.minDraftWords })
              : '.'}
          </p>
        </div>
        {completed ? (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-teal">
            <CheckCircle2 aria-hidden className="size-4" /> {t('learning.resource.unitComplete')}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-3">
          <Button variant="outline" disabled={save.isPending} onClick={() => submit(false)}>
            {t('learning.resource.save')}
          </Button>
          {content.completesOnApproval ? (
            <Button asChild>
              <Link to={'/learner/assignments' as never} search={{ programme } as never}>
                {t('learning.resource.submitShort')}{' '}
                <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Link>
            </Button>
          ) : completed ? null : (
            <Button
              disabled={save.isPending || !allTicked || count < content.minDraftWords}
              onClick={() => submit(true)}
            >
              {t('learning.resource.markComplete')}
            </Button>
          )}
        </div>
        {content.completesOnApproval ? (
          <p className="text-xs text-muted-foreground">{t('learning.resource.approvalNote')}</p>
        ) : null}
      </section>
    </div>
  )
}
