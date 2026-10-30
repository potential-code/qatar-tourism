import { useQuery } from '@tanstack/react-query'
import { ExternalLink, FileBox, Layers, ListChecks, PlayCircle, Route } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { ManagePage } from '../../hub/components/ManagePage'
import { Panel } from '../../hub/components/Panel'
import { CardsSkeleton, ErrorPanel } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { qDate } from '../../hub/utils/format'
import { type CourseItem, coursesQuery } from '../queries/courses.queries'
import { describeRule, FORMAT_LABEL, PACKAGE_LABEL } from '../utils/completion'
import { CourseEditor } from './CourseEditor'

export function CoursesPage() {
  const query = useQuery(coursesQuery())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const reduce = useReducedMotion()

  return (
    <ManagePage
      title="Course and content management"
      description="Courses C01 to C09 are the units learners progress through. Manage content packages, versions, completion mapping and learner-facing copy."
    >
      {query.isPending ? (
        <CardsSkeleton count={2} className="grid gap-6 xl:grid-cols-[340px_1fr]" />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        (() => {
          const course = query.data.items.find((c) => c.id === selectedId) ?? query.data.items[0]
          return (
            <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
              <nav aria-label="Courses" className="grid gap-2">
                {query.data.items.map((c) => {
                  const active = c.id === course?.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'relative grid gap-1 overflow-hidden rounded-xl border px-4 py-3 text-start transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        active
                          ? 'border-teal/40 bg-white shadow-md'
                          : 'bg-card/70 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm',
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId={reduce ? undefined : 'course-rail'}
                          className="absolute inset-y-0 start-0 w-1 bg-teal"
                        />
                      ) : null}
                      <span className="flex items-center justify-between text-xs font-medium text-teal tabular-nums">
                        {c.code}
                        <span className="text-muted-foreground">
                          {FORMAT_LABEL[c.format]} | {c.durationMinutes} min
                        </span>
                      </span>
                      <span className="font-medium text-ink">{c.title}</span>
                    </button>
                  )
                })}
              </nav>
              <AnimatePresence mode="wait">
                {course ? (
                  <motion.div
                    key={course.id}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <CourseDetail course={course} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })()
      )}
    </ManagePage>
  )
}

function CourseDetail({ course }: { course: CourseItem }) {
  const current = course.packages.find((p) => p.isCurrent) ?? course.packages[0]
  const completionRate = course.started ? Math.round((course.completed / course.started) * 100) : 0
  return (
    <Panel bodyClassName="p-0">
      <header className="grid gap-4 border-b bg-gradient-to-br from-sand to-white px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-sm font-medium text-teal">
              {course.code} | {FORMAT_LABEL[course.format]}
            </p>
            <h2 className="font-display text-3xl font-light text-ink">{course.title}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">{course.summary}</p>
          </div>
          {current?.launchUrl ? (
            <Button variant="outline" asChild>
              <a href={current.launchUrl} target="_blank" rel="noreferrer">
                <PlayCircle /> Preview content <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Duration" value={`${course.durationMinutes} min`} />
          <Metric label="Learners started" value={course.started.toLocaleString('en-GB')} />
          <Metric label="Completed" value={course.completed.toLocaleString('en-GB')} />
          <Metric label="Completion" value={`${completionRate}%`} />
        </dl>
      </header>
      <Tabs defaultValue="content" className="p-6">
        <TabsList>
          <TabsTrigger value="content">Content and versions</TabsTrigger>
          <TabsTrigger value="completion">Completion mapping</TabsTrigger>
          <TabsTrigger value="edit">Edit and preview</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="grid gap-5 pt-4">
          <section className="grid gap-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
              <Layers className="size-4 text-teal" aria-hidden /> Packages and resources
            </h3>
            <ul className="grid gap-3">
              {course.packages.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-teal-mist text-teal">
                      <FileBox className="size-5" aria-hidden />
                    </span>
                    <div className="grid gap-0.5">
                      <p className="font-medium text-ink">{p.title}</p>
                      <p className="text-sm text-muted-foreground">{p.formatLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.launchUrl ?? 'Attached resource, opened from the learner course page'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{PACKAGE_LABEL[p.type] ?? p.type}</Badge>
                    <Badge variant="outline" className="tabular-nums">
                      Version {p.version}
                    </Badge>
                    {p.isCurrent ? (
                      <StatusPill tone="good">Current</StatusPill>
                    ) : (
                      <StatusPill tone="muted">Previous</StatusPill>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Existing learners keep the package version they started. A new version applies to new
              starts.
              {course.packages.some((p) => p.type === 'html_preview')
                ? ' The branching preview is labelled as not a verified SCORM package.'
                : ''}
              {course.packages.some((p) => p.type === 'scorm_2004')
                ? ' This is our own SCORM 2004 sample package, built for the demo.'
                : ''}
            </p>
          </section>
          {course.transcript ? (
            <section className="grid gap-2">
              <h3 className="text-sm font-medium text-ink">Transcript</h3>
              <p className="max-h-48 overflow-y-auto rounded-xl bg-sand/70 p-4 text-sm leading-relaxed text-ink/80">
                {course.transcript}
              </p>
            </section>
          ) : null}
          <p className="text-xs text-muted-foreground">Last updated {qDate(course.updatedAt)}</p>
        </TabsContent>
        <TabsContent value="completion" className="grid gap-5 pt-4">
          <div className="flex items-start gap-3 rounded-xl border border-teal/25 bg-teal-mist/40 p-4">
            <ListChecks className="mt-0.5 size-5 text-teal" aria-hidden />
            <div className="grid gap-1">
              <p className="font-medium text-ink">{describeRule(course.completionRule)}</p>
              <p className="text-sm text-muted-foreground">Learner sees: {course.completionText}</p>
            </div>
          </div>
          <section className="grid gap-2">
            <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
              <Route className="size-4 text-teal" aria-hidden /> Required in published paths
            </h3>
            {course.usedIn.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not placed in a published path version.
              </p>
            ) : (
              <ul className="grid gap-2">
                {course.usedIn.map((u) => (
                  <li
                    key={`${u.path}-${u.required}`}
                    className="flex items-center justify-between rounded-lg bg-sand/60 px-3 py-2 text-sm"
                  >
                    <span>
                      {u.path}{' '}
                      <span className="text-muted-foreground">(Program {u.programme})</span>
                    </span>
                    <StatusPill tone={u.required ? 'info' : 'muted'}>
                      {u.required ? 'Required' : 'Optional'}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>
        <TabsContent value="edit" className="pt-4">
          <CourseEditor course={course} />
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl text-ink tabular-nums">{value}</dd>
    </div>
  )
}
