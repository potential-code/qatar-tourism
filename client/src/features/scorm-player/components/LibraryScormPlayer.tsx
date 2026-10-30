import type { ContentLanguage, ProgrammeCode } from '@shared/constants'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageOpen, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import { useContentLanguage } from '../hooks/useContentLanguage'
import { useLanguageSwitch } from '../hooks/useLanguageSwitch'
import { useScormRuntime } from '../hooks/useScormRuntime'
import { applySwitch, libraryUnitQuery, planSwitch } from '../queries/library.queries'
import { scormStateQuery, useScormRestart } from '../queries/scorm.queries'
import { secondsLabel } from '../utils/duration'
import { ContentLanguageControl } from './ContentLanguageControl'
import { LanguageSwitchPrompt } from './LanguageSwitchPrompt'
import { LibraryLaunchCard } from './LibraryLaunchCard'
import { ScormStatusLine } from './ScormStatusLine'

type Running = { packageId: string; language: ContentLanguage }

/**
 * Player for the SCORM 2004 Content Library unit (English and Arabic packages). The content
 * language is chosen separately from the portal language. Each language version keeps its own
 * bookmark; a mid-lesson switch saves first, asks, then continues at the equivalent screen when
 * the two versions share a bookmark layout. Completion credit counts once for the unit.
 */
export function LibraryScormPlayer({
  code,
  programme,
  title,
}: {
  code: string
  programme: ProgrammeCode
  title: string
}) {
  const { t } = useTranslation('content')
  const queryClient = useQueryClient()
  const invalidate = useInvalidateLearning()
  const content = useContentLanguage()
  const unit = useQuery(libraryUnitQuery(programme, code))
  const [running, setRunning] = useState<Running | null>(null)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [launching, setLaunching] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const variants = unit.data?.variants
  const desired = variants?.find((v) => v.language === content.language) ?? variants?.[0]
  const shown = running ?? desired
  const state = useQuery({
    ...scormStateQuery(programme, code, shown?.packageId),
    enabled: Boolean(shown),
  })
  const runtime = useScormRuntime(code, programme, shown?.packageId)
  const restart = useScormRestart(code, shown?.packageId)
  const { stop, start } = runtime

  // The unit's other version, when it holds progress this one does not.
  const sibling =
    desired && !desired.bookmark ? variants?.find((v) => v.bookmark && v !== desired) : undefined
  const siblingPlan = useQuery({
    queryKey: ['learning', 'library-plan', programme, code, sibling?.packageId, desired?.packageId],
    queryFn: () =>
      planSwitch(code, {
        programme,
        from: sibling?.packageId ?? '',
        to: desired?.packageId ?? '',
      }),
    enabled: Boolean(sibling && desired && !running),
  })

  const launchVariant = useCallback(
    async (variant: Running) => {
      const fresh = await queryClient.fetchQuery({
        ...scormStateQuery(programme, code, variant.packageId),
        staleTime: 0,
      })
      start(
        {
          entry: fresh.cmi.entry,
          location: fresh.cmi.location,
          suspendData: fresh.cmi.suspendData,
          completionStatus: fresh.cmi.completionStatus,
          successStatus: fresh.cmi.successStatus,
          scoreRaw: fresh.cmi.scoreRaw,
        },
        variant.packageId,
      )
      setRunning(variant)
    },
    [code, programme, queryClient, start],
  )

  const switcher = useLanguageSwitch({
    programme,
    code,
    variants: variants ?? [],
    positionUnit: 'screen',
    save: () => runtime.flush(frameRef.current),
    onSwitched: (variant) => {
      setRunning(null)
      void launchVariant(variant)
    },
  })
  const { request, open: promptOpen } = switcher

  // Changing the content language mid-lesson goes through the saved-progress prompt.
  useEffect(() => {
    if (running && !promptOpen && content.language !== running.language) {
      void request(running, content.language)
    }
  }, [content.language, running, promptOpen, request])

  const cancelSwitch = () => {
    // Stay where the learner is: pin the control to the running language.
    if (running) content.setPreference(running.language)
    switcher.cancel()
  }

  useEffect(() => {
    if (runtime.lastCommit?.completedNow) {
      toast.success(t('player.passedToast', { title }))
    }
  }, [runtime.lastCommit?.completedNow, title, t])

  // The package's own "Save and exit" posts this after it has terminated.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if ((event.data as { type?: string } | null)?.type === 'qta-scorm-exit') {
        setRunning(null)
        stop()
        void invalidate()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [invalidate, stop])

  if (unit.isLoading || (shown && state.isLoading)) {
    return <Skeleton className="aspect-[16/10] w-full rounded-xl" />
  }
  if (unit.error || !unit.data || !desired || !shown) {
    return <LoadError error={unit.error} onRetry={() => void unit.refetch()} />
  }
  if (state.error || !state.data) {
    return <LoadError error={state.error} onRetry={() => void state.refetch()} />
  }
  const lib = unit.data
  const cmi = state.data.cmi
  const pkg = state.data.package
  const versionLabel = (language: ContentLanguage) =>
    t(language === 'ar' ? 'language.versionAr' : 'language.versionEn')

  const launch = async () => {
    setLaunching(true)
    try {
      if (sibling && siblingPlan.data?.mapped) {
        await applySwitch(code, { programme, from: sibling.packageId, to: desired.packageId })
      }
      await launchVariant(desired)
    } finally {
      setLaunching(false)
    }
  }

  const close = () => {
    // Removing the frame fires the package's pagehide: it commits and terminates first.
    setRunning(null)
    window.setTimeout(() => {
      stop()
      void invalidate()
      void queryClient.invalidateQueries({ queryKey: ['learning', 'library'] })
    }, 300)
  }

  const doRestart = () =>
    restart.mutate(programme, {
      onSuccess: async () => {
        setConfirmRestart(false)
        await unit.refetch()
        await launchVariant({ packageId: desired.packageId, language: desired.language })
      },
      onError: () => toast.error(t('player.restartError')),
    })

  const completedBy = lib.variants.find((v) => v.packageId === lib.credit.completedPackageId)
  const notes: string[] = []
  if (lib.credit.completed) {
    notes.push(
      t('player.creditOnce', {
        version: versionLabel(completedBy?.language ?? desired.language),
      }),
    )
  }
  if (sibling && siblingPlan.data) {
    notes.push(
      siblingPlan.data.mapped
        ? t('player.siblingMapped', {
            from: versionLabel(sibling.language),
            unit: t('position.screen'),
            position: siblingPlan.data.position,
            total: siblingPlan.data.positions,
          })
        : t('player.siblingUnmapped', {
            from: versionLabel(sibling.language),
            to: versionLabel(desired.language),
          }),
    )
  }
  notes.push(t('player.captions'))

  const canResume = cmi.entry === 'resume'
  const position = /(\d+)/.exec(cmi.location)?.[1]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-teal text-white">
          <PackageOpen aria-hidden /> {t('player.formatScorm')}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t('player.versionLine', { packageId: pkg.packageId ?? '', version: pkg.version })}
        </span>
      </div>

      <ContentLanguageControl
        value={content.preference}
        onChange={content.setPreference}
        portal={content.portal}
        disabled={switcher.open}
      />

      {running ? (
        <div className="overflow-hidden rounded-xl border bg-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-sand px-4 py-2.5">
            <ScormStatusLine status={runtime.status} />
            <Button size="sm" variant="outline" onClick={close}>
              <X aria-hidden /> {t('player.closeReturn')}
            </Button>
          </div>
          <iframe
            key={running.packageId}
            ref={frameRef}
            title={t('player.iframeTitle', { title, version: versionLabel(running.language) })}
            src={pkg.launchUrl}
            lang={running.language}
            sandbox="allow-scripts allow-same-origin"
            className="block h-[78dvh] min-h-[34rem] w-full bg-sand md:h-[44rem]"
          />
        </div>
      ) : (
        <LibraryLaunchCard
          programme={programme}
          completed={lib.credit.completed}
          canResume={canResume}
          busy={launching}
          facts={[
            { label: t('player.completion'), value: cmi.completionStatus },
            { label: t('player.success'), value: cmi.successStatus },
            {
              label: t('player.score'),
              value: cmi.scoreRaw !== null ? `${cmi.scoreRaw}%` : t('player.notYet'),
            },
            {
              label: t('player.position'),
              value: position
                ? `${t('position.screen')} ${position} / ${lib.positions}`
                : t('player.start'),
            },
            { label: t('player.time'), value: secondsLabel(cmi.totalTimeSeconds) },
          ]}
          notes={notes}
          onLaunch={() => void launch()}
          onRestart={() => setConfirmRestart(true)}
        />
      )}

      <LanguageSwitchPrompt
        open={switcher.open}
        plan={switcher.plan}
        saving={switcher.saving}
        pending={switcher.pending}
        error={switcher.error}
        onConfirm={() => void switcher.confirm()}
        onCancel={cancelSwitch}
      />
      <ConfirmDialog
        open={confirmRestart}
        onOpenChange={setConfirmRestart}
        title={t('player.restartTitle')}
        description={t('player.restartBody')}
        confirmLabel={t('player.restartConfirm')}
        pending={restart.isPending}
        onConfirm={doRestart}
      />
    </div>
  )
}
