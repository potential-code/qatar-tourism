import { PATH_ITEM_KINDS, type PathItemKind } from '@shared/constants'
import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { CatalogueCourse, DraftItem } from '../types'
import { newItem } from '../utils/draft'
import { KIND_ICON } from '../utils/kinds'
import { ITEM_KIND_LABELS } from '../utils/rules'

const DEFAULT_TITLES: Partial<Record<PathItemKind, string>> = {
  assessment_pre: 'Pre-assessment (baseline)',
  assessment_post: 'Post-assessment',
  assessment_formative: 'Foundation quiz',
  ai_practice: 'AI practice',
  assignment: 'Practical assignment',
}

const CHOICE = '__choice__'

/** Adds a course, assessment, AI practice, session gate or assignment gate to the draft. */
export function AddItemDialog({
  open,
  onOpenChange,
  onAdd,
  courses,
  lastStage,
  lastLevel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: DraftItem) => void
  courses: CatalogueCourse[]
  lastStage: string
  lastLevel: number
}) {
  const [kind, setKind] = useState<PathItemKind>('course')
  const [courseId, setCourseId] = useState('')
  const [scenario, setScenario] = useState(CHOICE)
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState(lastStage)
  const [required, setRequired] = useState(true)

  useEffect(() => {
    if (!open) return
    setKind('course')
    setCourseId('')
    setScenario(CHOICE)
    setTitle('')
    setStage(lastStage)
    setRequired(true)
  }, [open, lastStage])

  const needsCourse = kind === 'course' || kind === 'session'
  const course = courses.find((c) => c.id === courseId)
  const scenarioTitle = ROLEPLAY_SCENARIOS.find((s) => s.key === scenario)?.title
  const suggested =
    (needsCourse
      ? course?.title
      : kind === 'ai_practice' && scenarioTitle
        ? `AI practice: ${scenarioTitle}`
        : DEFAULT_TITLES[kind]) ?? ''

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onAdd(
      newItem({
        kind,
        courseId: needsCourse ? courseId : null,
        courseCode: needsCourse ? (course?.code ?? null) : null,
        scenarioKey: kind === 'ai_practice' && scenario !== CHOICE ? scenario : null,
        title: title.trim() || suggested,
        required,
        level: lastLevel,
        stage: stage.trim() || lastStage,
        note: null,
      }),
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">Add to the path</DialogTitle>
            <DialogDescription>
              Added at the end of the draft. Drag it into place afterwards.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Item type</legend>
            <div className="grid grid-cols-2 gap-2">
              {PATH_ITEM_KINDS.map((k) => {
                const Icon = KIND_ICON[k]
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      kind === k
                        ? 'border-teal bg-teal-mist text-teal-deep'
                        : 'hover:border-teal/40',
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" />
                    {ITEM_KIND_LABELS[k]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {needsCourse ? (
            <div className="grid gap-1.5">
              <Label htmlFor="add-course">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="add-course" className="w-full">
                  <SelectValue placeholder="Choose an existing course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {kind === 'ai_practice' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="add-scenario">Practice scenario</Label>
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger id="add-scenario" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CHOICE}>Learner chooses</SelectItem>
                  {ROLEPLAY_SCENARIOS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="add-title">Title</Label>
              <Input
                id="add-title"
                value={title}
                placeholder={suggested}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-stage">Stage</Label>
              <Input id="add-stage" value={stage} onChange={(e) => setStage(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label htmlFor="add-required">Required for completion</Label>
            <Switch id="add-required" checked={required} onCheckedChange={setRequired} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={needsCourse && !courseId}>
              Add item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
