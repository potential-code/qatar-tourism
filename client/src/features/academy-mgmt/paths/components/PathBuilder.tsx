import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { useQuery } from '@tanstack/react-query'
import { FilePenLine, ListChecks, Plus, Rocket, Save, Star, Undo2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { easeOut } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  catalogueQuery,
  pathDetailQuery,
  useDiscardDraft,
  useSaveDraft,
  useSetDefaultPath,
  useStartDraft,
} from '../queries/paths.queries'
import type { DraftItem } from '../types'
import { completionRule, diffItems, toDraft, toInput } from '../utils/draft'
import { AddItemDialog } from './AddItemDialog'
import { LearnerPreview } from './LearnerPreview'
import { PublishDialog } from './PublishDialog'
import { SortableItemRow } from './SortableItemRow'
import { VersionHistory } from './VersionHistory'

/**
 * The learning path builder (brief §14): ordered items with drag-and-drop, required versus
 * optional, gates, a live learner preview and versioned publishing.
 */
export function PathBuilder({ pathId }: { pathId: string }) {
  const reduce = useReducedMotion()
  const detail = useQuery(pathDetailQuery(pathId))
  const catalogue = useQuery(catalogueQuery())
  const startDraft = useStartDraft(pathId)
  const saveDraft = useSaveDraft(pathId)
  const discard = useDiscardDraft(pathId)
  const setDefault = useSetDefaultPath()

  const versions = detail.data?.versions ?? []
  const draft = versions.find((v) => v.status === 'draft') ?? null
  const current = versions.find((v) => v.isCurrent) ?? null
  const base = draft ?? current
  const editable = Boolean(draft)

  const [items, setItems] = useState<DraftItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [discarding, setDiscarding] = useState(false)

  // Re-seed local state whenever the version being shown (or its saved content) changes.
  const baseKey = base ? `${base.id}:${base.updatedAt}:${base.items.length}` : 'none'
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the saved version
  useEffect(() => {
    if (base) setItems(toDraft(base.items))
  }, [baseKey])

  const dirty = useMemo(
    () =>
      Boolean(base) &&
      JSON.stringify(toInput(items)) !== JSON.stringify(toInput(toDraft(base?.items ?? []))),
    [items, base],
  )
  const changes = useMemo(() => (current ? diffItems(current.items, items) : []), [current, items])
  const changedTitles = new Set(changes.map((c) => c.title))
  const stages = [...new Set(items.map((i) => i.stage))]
  const maxLevel = Math.max(1, ...items.map((i) => i.level))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setItems((list) => {
      const from = list.findIndex((i) => i.key === active.id)
      const to = list.findIndex((i) => i.key === over.id)
      return arrayMove(list, from, to)
    })
  }

  const save = () =>
    saveDraft.mutate(
      { items: toInput(items) },
      {
        onSuccess: () =>
          toast.success(`Draft v${draft?.version} saved. The learner preview is up to date.`),
        onError: (error) => toast.error(error.message),
      },
    )

  if (detail.isLoading)
    return (
      <div className="grid gap-6">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    )
  if (detail.isError || !detail.data)
    return (
      <EmptyState
        variant="destructive"
        title="This path could not be loaded"
        description={detail.error?.message ?? 'Unknown error'}
        action={<Button onClick={() => detail.refetch()}>Try again</Button>}
      />
    )

  const { path } = detail.data
  const enrolled = versions.reduce((s, v) => s + v.enrolments.total, 0)
  const completedAll = versions.reduce((s, v) => s + v.enrolments.completed, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={path.name}
        description={path.description}
        breadcrumbs={[
          { label: 'Academy Management', to: '/admin/manage' },
          { label: 'Learning path management', to: '/admin/manage/paths' },
          { label: path.name },
        ]}
        actions={
          <>
            <DemoBadge compact />
            {!path.isDefault && current ? (
              <Button
                variant="outline"
                disabled={setDefault.isPending}
                onClick={() =>
                  setDefault.mutate(pathId, {
                    onSuccess: () =>
                      toast.success(
                        `${path.name} is now the ${PROGRAMME_LABELS[path.programme]} default`,
                      ),
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <Star aria-hidden /> Make default
              </Button>
            ) : null}
            {editable ? (
              <>
                {current ? (
                  <Button variant="ghost" onClick={() => setDiscarding(true)}>
                    <Undo2 aria-hidden /> Discard draft
                  </Button>
                ) : null}
                <Button variant="outline" onClick={save} disabled={!dirty || saveDraft.isPending}>
                  <Save aria-hidden /> {saveDraft.isPending ? 'Saving' : 'Save draft'}
                </Button>
                <Button onClick={() => setPublishing(true)} disabled={dirty || items.length === 0}>
                  <Rocket aria-hidden /> Publish v{draft?.version}
                </Button>
              </>
            ) : (
              <Button
                onClick={() =>
                  startDraft.mutate(undefined, {
                    onSuccess: (d) =>
                      toast.success(`Draft v${d.version} started from the published version`),
                    onError: (e) => toast.error(e.message),
                  })
                }
                disabled={startDraft.isPending}
              >
                <FilePenLine aria-hidden /> Edit as new draft
              </Button>
            )}
          </>
        }
      />

      <dl className="grid grid-cols-5 divide-x rounded-xl border bg-card shadow-xs">
        {(
          [
            ['Programme', PROGRAMME_LABELS[path.programme]],
            ['Published', current ? `Version ${current.version}` : 'Not yet'],
            ['Draft', draft ? `Version ${draft.version}${dirty ? ', unsaved' : ''}` : 'None'],
            ['Enrolments', enrolled.toLocaleString('en-GB')],
            ['Completed', completedAll.toLocaleString('en-GB')],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-display text-xl text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="builder-title"
          className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs"
        >
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <h2
                id="builder-title"
                className="flex items-center gap-2 font-display text-xl text-ink"
              >
                {editable
                  ? `Draft version ${draft?.version}`
                  : `Published version ${current?.version}`}
                {editable ? (
                  <Badge
                    variant="outline"
                    className="border-maroon/30 bg-maroon-mist font-sans text-maroon-deep"
                  >
                    {dirty ? 'Unsaved changes' : 'Editing'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-sans">
                    Read only
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editable
                  ? 'Drag to reorder. Toggle required or optional. Learners keep their version until you publish and choose to migrate.'
                  : 'Published versions never change. Start a draft to edit.'}
              </p>
            </div>
            {editable ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdding(true)}
                disabled={!catalogue.data}
              >
                <Plus aria-hidden /> Add item
              </Button>
            ) : null}
          </header>

          <AnimatePresence>
            {editable && changes.length > 0 ? (
              <motion.p
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: easeOut }}
                className="rounded-lg bg-maroon-mist/70 px-3 py-2 text-xs text-maroon-deep"
              >
                {changes.length} {changes.length === 1 ? 'change' : 'changes'} since version{' '}
                {current?.version}:{' '}
                {changes
                  .slice(0, 3)
                  .map((c) => `${c.title} (${c.type})`)
                  .join(', ')}
                {changes.length > 3 ? ` and ${changes.length - 3} more` : ''}.
              </motion.p>
            ) : null}
          </AnimatePresence>

          {items.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="This draft has no items"
              description="Add courses, assessments, AI practice and gates to build the path."
              action={
                editable ? <Button onClick={() => setAdding(true)}>Add item</Button> : undefined
              }
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={items.map((i) => i.key)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="grid gap-2">
                  {items.map((item, index) => {
                    const prev = items[index - 1]
                    const header = !prev || prev.stage !== item.stage || prev.level !== item.level
                    return (
                      <SortableFragment
                        key={item.key}
                        header={header}
                        level={item.level}
                        stage={item.stage}
                      >
                        <SortableItemRow
                          item={item}
                          index={index}
                          editable={editable}
                          expanded={expanded === item.key}
                          onToggle={() => setExpanded((k) => (k === item.key ? null : item.key))}
                          onChange={(next) =>
                            setItems((list) => list.map((i) => (i.key === item.key ? next : i)))
                          }
                          onRemove={() =>
                            setItems((list) => list.filter((i) => i.key !== item.key))
                          }
                          courses={catalogue.data ?? []}
                          stages={stages}
                          maxLevel={maxLevel}
                          highlight={editable && changedTitles.has(item.title)}
                        />
                      </SortableFragment>
                    )
                  })}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <footer className="grid gap-1 rounded-lg border bg-sand/60 px-4 py-3">
            <p className="text-xs font-medium text-ink">Completion rule</p>
            <p className="text-sm text-ink/80">{completionRule(items)}</p>
          </footer>
        </section>

        <aside className="rounded-xl border bg-card p-5 shadow-xs xl:sticky xl:top-20">
          <Tabs defaultValue="preview">
            <TabsList className="mb-3 w-full rounded-full">
              <TabsTrigger value="preview" className="flex-1 rounded-full">
                Learner preview
              </TabsTrigger>
              <TabsTrigger value="versions" className="flex-1 rounded-full">
                Versions ({versions.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <LearnerPreview
                pathId={pathId}
                versionId={base?.id}
                items={items}
                label={
                  editable
                    ? `Preview of draft v${draft?.version}${dirty ? ' with unsaved changes' : ''}`
                    : `Published version ${current?.version}`
                }
              />
            </TabsContent>
            <TabsContent value="versions">
              <VersionHistory versions={versions} />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {catalogue.data ? (
        <AddItemDialog
          open={adding}
          onOpenChange={setAdding}
          onAdd={(item) => {
            setItems((list) => [...list, item])
            setExpanded(item.key)
          }}
          courses={catalogue.data}
          lastStage={items.at(-1)?.stage ?? 'Stage 1'}
          lastLevel={items.at(-1)?.level ?? 1}
        />
      ) : null}
      {draft ? (
        <PublishDialog
          open={publishing}
          onOpenChange={setPublishing}
          pathId={pathId}
          draft={draft}
          versions={versions}
          changes={changes}
        />
      ) : null}
      <ConfirmDialog
        open={discarding}
        onOpenChange={setDiscarding}
        title={`Discard draft version ${draft?.version}?`}
        description="The draft and its unsaved changes are removed. The published version and every learner record stay as they are."
        confirmLabel="Discard draft"
        pending={discard.isPending}
        onConfirm={() =>
          discard.mutate(undefined, {
            onSuccess: () => {
              toast.success('Draft discarded')
              setDiscarding(false)
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </div>
  )
}

/** A stage heading above the first item of each level and stage. */
function SortableFragment({
  header,
  level,
  stage,
  children,
}: {
  header: boolean
  level: number
  stage: string
  children: ReactNode
}) {
  return (
    <>
      {header ? (
        <li aria-hidden className="flex items-center gap-3 pt-3 first:pt-0">
          <span className="text-[11px] font-semibold tracking-wide text-teal-deep">
            Level {level}: {stage}
          </span>
          <span className="h-px flex-1 bg-teal/15" />
        </li>
      ) : null}
      {children}
    </>
  )
}
