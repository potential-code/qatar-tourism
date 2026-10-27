import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api'
import { Field } from '../../hub/components/Field'
import type { CourseItem } from '../queries/courses.queries'
import { useUpdateCourse } from '../queries/courses.queries'
import { FORMAT_LABEL } from '../utils/completion'

/**
 * Edit the learner-facing copy with a live preview of the learner card before saving
 * (brief §14: "Content editing must preview the result before publication").
 */
export function CourseEditor({ course }: { course: CourseItem }) {
  const update = useUpdateCourse(course.id)
  const [summary, setSummary] = useState(course.summary)
  const [completionText, setCompletionText] = useState(course.completionText)
  const [transcript, setTranscript] = useState(course.transcript ?? '')

  useEffect(() => {
    setSummary(course.summary)
    setCompletionText(course.completionText)
    setTranscript(course.transcript ?? '')
  }, [course])

  const changes = {
    ...(summary.trim() !== course.summary ? { summary: summary.trim() } : {}),
    ...(completionText.trim() !== course.completionText
      ? { completionText: completionText.trim() }
      : {}),
    ...(course.format === 'video' && transcript.trim() !== (course.transcript ?? '')
      ? { transcript: transcript.trim() || null }
      : {}),
  }
  const dirty = Object.keys(changes).length > 0
  const summaryError = summary.trim().length < 10 ? 'Write at least 10 characters' : null
  const completionError = completionText.trim().length < 5 ? 'Write at least 5 characters' : null

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form
        className="grid gap-5"
        onSubmit={async (e) => {
          e.preventDefault()
          if (summaryError || completionError || !dirty) return
          try {
            await update.mutateAsync(changes)
            toast.success(`${course.code} updated`, {
              description: 'Recorded in the audit trail as course.update.',
            })
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : 'The course could not be saved')
          }
        }}
      >
        <Field id="ce-summary" label="Learner-facing summary" error={summaryError}>
          <Textarea
            id="ce-summary"
            rows={4}
            className="rounded-lg"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Field>
        <Field
          id="ce-completion"
          label="Completion text"
          hint="Shown to the learner beside the progress indicator"
          error={completionError}
        >
          <Textarea
            id="ce-completion"
            rows={2}
            className="rounded-lg"
            value={completionText}
            onChange={(e) => setCompletionText(e.target.value)}
          />
        </Field>
        {course.format === 'video' ? (
          <Field
            id="ce-transcript"
            label="Transcript"
            hint="Captions and the transcript keep video learning accessible"
          >
            <Textarea
              id="ce-transcript"
              rows={8}
              className="rounded-lg font-mono text-xs"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </Field>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty}
            onClick={() => {
              setSummary(course.summary)
              setCompletionText(course.completionText)
              setTranscript(course.transcript ?? '')
            }}
          >
            Discard
          </Button>
          <Button
            type="submit"
            disabled={!dirty || update.isPending || Boolean(summaryError || completionError)}
          >
            {update.isPending ? 'Saving' : 'Save and publish copy'}
          </Button>
        </div>
      </form>
      <aside className="grid content-start gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <Eye className="size-4 text-teal" aria-hidden /> Learner preview
        </p>
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-teal to-teal-soft" />
          <div className="grid gap-2 p-5">
            <p className="text-xs font-medium text-teal">
              {course.code} | {FORMAT_LABEL[course.format]} | {course.durationMinutes} min
            </p>
            <p className="font-display text-xl text-ink">{course.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {summary || 'Summary will appear here.'}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-teal-mist">
              <div className="h-full w-1/3 rounded-full bg-teal" />
            </div>
            <p className="text-xs text-muted-foreground">
              {completionText || 'Completion text will appear here.'}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {dirty
            ? 'Unsaved changes are shown in the preview only.'
            : 'The preview matches what learners see now.'}
        </p>
      </aside>
    </div>
  )
}
