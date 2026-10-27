import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'
import { ChevronDown, GripVertical, Trash2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { easeOut } from '@/components/motion'
import { Button } from '@/components/ui/button'
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
import { KIND_ICON } from '../utils/kinds'
import { ITEM_KIND_LABELS } from '../utils/rules'

const ANY_SCENARIO = '__choice__'

/** One draggable path item. Expands to edit its details. Read-only when no draft is open. */
export function SortableItemRow({
  item,
  index,
  editable,
  expanded,
  onToggle,
  onChange,
  onRemove,
  courses,
  stages,
  maxLevel,
  highlight,
}: {
  item: DraftItem
  index: number
  editable: boolean
  expanded: boolean
  onToggle: () => void
  onChange: (next: DraftItem) => void
  onRemove: () => void
  courses: CatalogueCourse[]
  stages: string[]
  maxLevel: number
  highlight: boolean
}) {
  const reduce = useReducedMotion()
  const uid = useId()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled: !editable,
  })
  const Icon = KIND_ICON[item.kind]
  const scenario = ROLEPLAY_SCENARIOS.find((s) => s.key === item.scenarioKey)
  const meta =
    item.courseCode ??
    (item.kind === 'ai_practice' ? (scenario?.title ?? 'Learner chooses the scenario') : null)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative rounded-xl border bg-card transition-shadow',
        isDragging && 'z-10 shadow-lg ring-2 ring-teal/40',
        highlight && 'border-maroon/40',
      )}
    >
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
        {editable ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${item.title}. Press space, then arrow keys.`}
            className="grid size-8 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground hover:bg-sand-deep hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        ) : (
          <span className="grid size-8 place-items-center text-xs tabular-nums text-muted-foreground">
            {index + 1}
          </span>
        )}
        <span
          className={cn(
            'grid size-9 place-items-center rounded-lg',
            item.required ? 'bg-teal-mist text-teal-deep' : 'bg-sand-deep text-ink/60',
          )}
        >
          <Icon aria-hidden className="size-4" />
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="grid min-w-0 gap-0.5 rounded-md text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="truncate text-sm font-medium text-ink">{item.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {ITEM_KIND_LABELS[item.kind]}
            {meta ? `, ${meta}` : ''}
            {item.note ? `, ${item.note}` : ''}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-medium',
              item.required ? 'bg-teal/10 text-teal-deep' : 'bg-muted text-muted-foreground',
            )}
          >
            {item.required ? 'Required' : 'Optional'}
          </span>
          {editable ? (
            <Switch
              checked={item.required}
              onCheckedChange={(required) => onChange({ ...item, required })}
              aria-label={`${item.title} is required`}
            />
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            <ChevronDown
              aria-hidden
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="overflow-hidden"
          >
            <fieldset
              disabled={!editable}
              className="grid grid-cols-2 gap-3 border-t bg-sand/50 px-4 py-4 xl:grid-cols-4"
            >
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor={`${uid}-title`}>Title</Label>
                <Input
                  id={`${uid}-title`}
                  value={item.title}
                  onChange={(e) => onChange({ ...item, title: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${uid}-stage`}>Stage</Label>
                <Input
                  id={`${uid}-stage`}
                  list={`${uid}-stages`}
                  value={item.stage}
                  onChange={(e) => onChange({ ...item, stage: e.target.value })}
                />
                <datalist id={`${uid}-stages`}>
                  {stages.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${uid}-level`}>Level</Label>
                <Select
                  value={String(item.level)}
                  onValueChange={(v) => onChange({ ...item, level: Number(v) })}
                >
                  <SelectTrigger id={`${uid}-level`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.max(maxLevel, 2) }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Level {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {item.kind === 'course' || item.kind === 'session' ? (
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor={`${uid}-course`}>Course</Label>
                  <Select
                    value={item.courseId ?? ''}
                    onValueChange={(v) => {
                      const course = courses.find((c) => c.id === v)
                      onChange({ ...item, courseId: v, courseCode: course?.code ?? null })
                    }}
                  >
                    <SelectTrigger id={`${uid}-course`} className="w-full">
                      <SelectValue placeholder="Choose a course" />
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
              {item.kind === 'ai_practice' ? (
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor={`${uid}-scenario`}>Practice scenario</Label>
                  <Select
                    value={item.scenarioKey ?? ANY_SCENARIO}
                    onValueChange={(v) =>
                      onChange({ ...item, scenarioKey: v === ANY_SCENARIO ? null : v })
                    }
                  >
                    <SelectTrigger id={`${uid}-scenario`} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY_SCENARIO}>Learner chooses</SelectItem>
                      {ROLEPLAY_SCENARIOS.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor={`${uid}-note`}>Context note</Label>
                <Input
                  id={`${uid}-note`}
                  value={item.note ?? ''}
                  placeholder="Optional, e.g. Transport scenario"
                  onChange={(e) => onChange({ ...item, note: e.target.value || null })}
                />
              </div>
              {editable ? (
                <div className="col-span-2 flex items-end justify-end xl:col-span-4">
                  <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
                    <Trash2 aria-hidden /> Remove from path
                  </Button>
                </div>
              ) : null}
            </fieldset>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  )
}
