import { COMPETENCIES, QUESTION_DIFFICULTIES, QUESTION_TYPES } from '@shared/constants'
import { Info, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-error'
import { Field } from '../../hub/components/Field'
import { OptionSelect } from '../../hub/components/OptionSelect'
import {
  type QuestionInput,
  type QuestionListItem,
  useSaveQuestion,
} from '../queries/assessments.queries'
import {
  COMPETENCY_LABELS,
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
  TYPE_LABELS,
  toOptions,
} from '../utils/labels'

type Draft = Omit<QuestionInput, 'publish'> & { sharedId?: string }

const BLANK: Draft = {
  competency: 'discover_needs',
  programme: 'all',
  difficulty: 'easy',
  language: 'en',
  type: 'single',
  prompt: '',
  options: [
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ],
  correct: [],
  feedback: '',
  points: 1,
}

const fromRow = (q: QuestionListItem): Draft => ({
  id: q.id,
  competency: q.competency,
  programme: q.programme,
  difficulty: q.difficulty,
  language: q.language,
  type: q.type,
  prompt: q.prompt,
  options: q.options.map((o) => ({ ...o })),
  correct: [...q.correct],
  feedback: q.feedback,
  points: q.points,
})

/** Create a question, or edit one. Editing a published question saves the next version as a draft. */
export function QuestionEditor({
  target,
  onClose,
}: {
  target: QuestionListItem | 'new' | null
  onClose: () => void
}) {
  const save = useSaveQuestion()
  const [draft, setDraft] = useState<Draft>(BLANK)
  const [errors, setErrors] = useState<string[]>([])
  const editing = target !== null && target !== 'new' ? target : null

  useEffect(() => {
    setErrors([])
    setDraft(editing ? fromRow(editing) : BLANK)
  }, [editing])

  const patch = (next: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...next }))
  const dir = draft.language === 'ar' ? 'rtl' : 'ltr'
  const multiple = draft.type === 'multiple'

  const setCorrect = (key: string) =>
    patch({
      correct: multiple
        ? draft.correct.includes(key)
          ? draft.correct.filter((k) => k !== key)
          : [...draft.correct, key]
        : [key],
    })
  const setOption = (index: number, text: string) =>
    patch({ options: draft.options.map((o, i) => (i === index ? { ...o, text } : o)) })
  const addOption = () => {
    const key = String.fromCharCode(65 + draft.options.length)
    patch({ options: [...draft.options, { key, text: '' }] })
  }
  const removeOption = (index: number) => {
    const removed = draft.options[index]?.key
    // Keep keys A, B, C... in order so they stay predictable.
    const options = draft.options
      .filter((_, i) => i !== index)
      .map((o, i) => ({ ...o, key: String.fromCharCode(65 + i) }))
    patch({
      options,
      correct: draft.correct
        .filter((k) => k !== removed)
        .filter((k) => options.some((o) => o.key === k)),
    })
  }

  const submit = (publish: boolean) => {
    setErrors([])
    save.mutate(
      { ...draft, publish },
      {
        onSuccess: (saved) => {
          toast.success(
            publish
              ? `${saved.questionId} version ${saved.version} published`
              : `${saved.questionId} version ${saved.version} saved as a draft`,
          )
          onClose()
        },
        onError: (e) => {
          const issues = (e instanceof ApiError ? e.details : null) as {
            issues?: { message: string }[]
          } | null
          setErrors(
            issues?.issues?.map((i) => i.message) ?? [
              e instanceof Error ? e.message : 'Could not save',
            ],
          )
        },
      },
    )
  }

  const willVersion = editing?.status === 'published'

  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl font-normal">
            {editing ? `Edit ${editing.questionId}` : 'New question'}
          </SheetTitle>
          <SheetDescription>
            Attempts keep the version they drew, so editing the bank never changes a completed
            attempt.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-4">
          {willVersion ? (
            <p className="flex items-start gap-2 rounded-lg bg-teal-mist p-3 text-sm text-teal-deep">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              Saving creates version {(editing?.version ?? 0) + 1} as a draft. Version{' '}
              {editing?.version} stays live until you publish the new one.
            </p>
          ) : null}
          {errors.length > 0 ? (
            <ul
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="q-competency" label="Competency">
              <OptionSelect
                id="q-competency"
                value={draft.competency}
                onChange={(v) => v && patch({ competency: v as Draft['competency'] })}
                options={COMPETENCIES.map((c) => ({ value: c, label: COMPETENCY_LABELS[c] }))}
              />
            </Field>
            <Field id="q-difficulty" label="Difficulty">
              <OptionSelect
                id="q-difficulty"
                value={draft.difficulty}
                onChange={(v) => v && patch({ difficulty: v as Draft['difficulty'] })}
                options={QUESTION_DIFFICULTIES.map((d) => ({
                  value: d,
                  label: DIFFICULTY_LABELS[d],
                }))}
              />
            </Field>
            <Field id="q-type" label="Type">
              <OptionSelect
                id="q-type"
                value={draft.type}
                onChange={(v) => v && patch({ type: v as Draft['type'], correct: [] })}
                options={QUESTION_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
              />
            </Field>
            <Field
              id="q-language"
              label="Language"
              hint={editing ? 'Fixed once created' : undefined}
            >
              <OptionSelect
                id="q-language"
                value={draft.language}
                onChange={(v) => v && !editing && patch({ language: v as Draft['language'] })}
                options={toOptions(LANGUAGE_LABELS)}
                className={editing ? 'pointer-events-none h-10 rounded-lg bg-muted' : undefined}
              />
            </Field>
            <Field id="q-programme" label="Programme">
              <OptionSelect
                id="q-programme"
                value={draft.programme}
                onChange={(v) => v && patch({ programme: v as Draft['programme'] })}
                options={[
                  { value: 'all', label: 'Both programmes' },
                  { value: 'A', label: 'Program A only' },
                  { value: 'B', label: 'Program B only' },
                ]}
              />
            </Field>
            <Field id="q-points" label="Points">
              <Input
                id="q-points"
                type="number"
                min={1}
                max={10}
                value={draft.points}
                onChange={(e) => patch({ points: Number(e.target.value) })}
                className="w-24"
              />
            </Field>
          </div>
          {!editing ? (
            <Field
              id="q-shared"
              label="Question set (optional)"
              hint="To add a translation, enter the set of the existing question, for example QS-DN-001."
            >
              <Input
                id="q-shared"
                value={draft.sharedId ?? ''}
                onChange={(e) => patch({ sharedId: e.target.value.trim() || undefined })}
                className="w-48"
              />
            </Field>
          ) : null}
          <Field id="q-prompt" label="Question">
            <Textarea
              id="q-prompt"
              value={draft.prompt}
              onChange={(e) => patch({ prompt: e.target.value })}
              rows={3}
              dir={dir}
              lang={draft.language}
            />
          </Field>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">
              Options and {multiple ? 'correct answers' : 'the correct answer'}
            </legend>
            {draft.options.map((option, index) => (
              <div key={option.key} className="flex items-center gap-2">
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name="correct"
                  checked={draft.correct.includes(option.key)}
                  onChange={() => setCorrect(option.key)}
                  aria-label={`Option ${option.key} is correct`}
                  className="size-4 accent-[var(--color-teal)]"
                />
                <span className="w-5 text-sm font-medium text-muted-foreground">{option.key}</span>
                <Input
                  value={option.text}
                  onChange={(e) => setOption(index, e.target.value)}
                  aria-label={`Option ${option.key} text`}
                  dir={dir}
                  lang={draft.language}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={draft.options.length <= 2}
                  onClick={() => removeOption(index)}
                  aria-label={`Remove option ${option.key}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {draft.options.length < 6 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={addOption}
              >
                <Plus /> Add option
              </Button>
            ) : null}
          </fieldset>
          <Field id="q-feedback" label="Feedback shown to the learner">
            <Textarea
              id="q-feedback"
              value={draft.feedback}
              onChange={(e) => patch({ feedback: e.target.value })}
              rows={3}
              dir={dir}
              lang={draft.language}
            />
          </Field>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => submit(false)} disabled={save.isPending}>
            Save draft
          </Button>
          <Button onClick={() => submit(true)} disabled={save.isPending}>
            Save and publish
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
