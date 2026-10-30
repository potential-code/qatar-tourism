import type { ProgrammeCode } from '@shared/constants'
import { isLibraryCourse } from '@shared/content/curriculum'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Info, PackageOpen, Play, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import { useScormRuntime } from '../hooks/useScormRuntime'
import { scormStateQuery, useScormRestart } from '../queries/scorm.queries'
import { secondsLabel } from '../utils/duration'
import { LibraryScormPlayer } from './LibraryScormPlayer'
import { ScormStatusLine } from './ScormStatusLine'

/**
 * Player for the SCORM 2004 sample package (brief §8): launch, resume, restart with
 * confirmation, close and return. The package runs in a sandboxed same-origin iframe (scripts
 * only: no forms, popups or top navigation) and talks to scorm-again through API_1484_11.
 */
export function ScormPlayer({
  code,
  programme,
  title,
}: {
  code: string
  programme: ProgrammeCode
  title: string
}) {
  // The English/Arabic Content Library unit has its own player (language control, per-package
  // bookmarks). C04 keeps the original single-package player below.
  return isLibraryCourse(code) ? (
    <LibraryScormPlayer code={code} programme={programme} title={title} />
  ) : (
    <SinglePackagePlayer code={code} programme={programme} title={title} />
  )
}

function SinglePackagePlayer({
  code,
  programme,
  title,
}: {
  code: string
  programme: ProgrammeCode
  title: string
}) {
  const state = useQuery(scormStateQuery(programme, code))
  const runtime = useScormRuntime(code, programme)
  const restart = useScormRestart(code)
  const invalidate = useInvalidateLearning()
  const [running, setRunning] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const { stop } = runtime

  // The package's own "Save and exit" posts this after it has terminated.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if ((event.data as { type?: string } | null)?.type === 'qta-scorm-exit') {
        setRunning(false)
        stop()
        void invalidate()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [invalidate, stop])

  useEffect(() => {
    if (runtime.lastCommit?.completedNow) {
      toast.success(`Passed. ${title} is complete and your progress is updated.`)
    }
  }, [runtime.lastCommit?.completedNow, title])

  if (state.isLoading) return <Skeleton className="aspect-[16/10] w-full rounded-xl" />
  if (state.error || !state.data) {
    return <LoadError error={state.error} onRetry={() => void state.refetch()} />
  }
  const { cmi, unit } = state.data
  const pkg = state.data.package

  const launch = () => {
    runtime.start({
      entry: cmi.entry,
      location: cmi.location,
      suspendData: cmi.suspendData,
      completionStatus: cmi.completionStatus,
      successStatus: cmi.successStatus,
      scoreRaw: cmi.scoreRaw,
    })
    setRunning(true)
  }

  const close = () => {
    // Removing the frame fires the package's pagehide: it commits and terminates first.
    setRunning(false)
    window.setTimeout(() => {
      stop()
      void invalidate()
    }, 300)
  }

  const doRestart = () =>
    restart.mutate(programme, {
      onSuccess: async () => {
        setConfirmRestart(false)
        const fresh = await state.refetch()
        if (fresh.data) {
          runtime.start({
            entry: 'ab-initio',
            location: '',
            suspendData: '',
            completionStatus: fresh.data.cmi.completionStatus,
            successStatus: fresh.data.cmi.successStatus,
            scoreRaw: fresh.data.cmi.scoreRaw,
          })
          setRunning(true)
        }
      },
      onError: () => toast.error('Could not restart. Try again.'),
    })

  const canResume = cmi.entry === 'resume'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-teal text-white">
          <PackageOpen aria-hidden /> {pkg.formatLabel}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Package version {pkg.version}. Built as a standards-compatible sample, not exported from
          Articulate.
        </span>
      </div>

      {running ? (
        <div className="overflow-hidden rounded-xl border bg-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-sand px-4 py-2.5">
            <ScormStatusLine status={runtime.status} />
            <Button size="sm" variant="outline" onClick={close}>
              <X aria-hidden /> Close and return
            </Button>
          </div>
          <iframe
            ref={frameRef}
            title={`${title}: SCORM 2004 sample package`}
            src={pkg.launchUrl ?? ''}
            sandbox="allow-scripts allow-same-origin"
            className="block h-[78dvh] min-h-[34rem] w-full bg-sand md:h-[44rem]"
          />
        </div>
      ) : (
        <div className="grid gap-6 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-normal text-ink">
              {unit.status === 'completed'
                ? 'Module passed'
                : canResume
                  ? 'Continue where you left off'
                  : 'Ready to launch'}
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Completion</dt>
                <dd className="font-medium text-ink capitalize">{cmi.completionStatus}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Success</dt>
                <dd className="font-medium text-ink capitalize">{cmi.successStatus}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Score</dt>
                <dd className="font-medium text-ink">
                  {cmi.scoreRaw !== null ? `${cmi.scoreRaw}%` : 'Not yet'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Time in module</dt>
                <dd className="font-medium text-ink">{secondsLabel(cmi.totalTimeSeconds)}</dd>
              </div>
            </dl>
            {unit.status === 'completed' ? (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-teal">
                <CheckCircle2 aria-hidden className="size-4" /> Passed with at least 80 percent.
                Your progress was updated once.
              </p>
            ) : null}
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Captions: this package has no audio or video, so there is nothing to caption. Closing
              saves your place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:flex-col">
            <Button size="lg" onClick={launch}>
              <Play aria-hidden />{' '}
              {canResume ? 'Resume' : unit.status === 'completed' ? 'Open again' : 'Launch'}
            </Button>
            {canResume || unit.status === 'completed' ? (
              <Button size="lg" variant="outline" onClick={() => setConfirmRestart(true)}>
                <RotateCcw aria-hidden /> Restart
              </Button>
            ) : null}
            <Button asChild size="lg" variant="ghost">
              <Link to="/learner/learning" search={{ programme }}>
                Return to my path
              </Link>
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRestart}
        onOpenChange={setConfirmRestart}
        title="Restart the module?"
        description="Your saved place and answers in this package will be cleared and it will start from the beginning. A pass you already achieved stays recorded."
        confirmLabel="Restart from the beginning"
        pending={restart.isPending}
        onConfirm={doRestart}
      />
    </div>
  )
}
