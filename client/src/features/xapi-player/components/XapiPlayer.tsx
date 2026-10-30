import type { ContentLanguage, ProgrammeCode } from '@shared/constants'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Radio, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { useInvalidateLearning } from '@/features/learning/queries/learning.queries'
import { ContentLanguageControl } from '@/features/scorm-player/components/ContentLanguageControl'
import { LanguageSwitchPrompt } from '@/features/scorm-player/components/LanguageSwitchPrompt'
import { LibraryLaunchCard } from '@/features/scorm-player/components/LibraryLaunchCard'
import { useContentLanguage } from '@/features/scorm-player/hooks/useContentLanguage'
import { useLanguageSwitch } from '@/features/scorm-player/hooks/useLanguageSwitch'
import {
  applySwitch,
  libraryUnitQuery,
  planSwitch,
} from '@/features/scorm-player/queries/library.queries'
import * as xapi from '@/services/xapi.service'
import { useXapiBridge } from '../hooks/useXapiBridge'
import { useXapiRestart, xapiLaunchQuery } from '../queries/xapi.queries'
import { StatementsTable } from './StatementsTable'

type Running = { packageId: string; language: ContentLanguage }

/**
 * Player for the xAPI Content Library unit (English and Arabic activities). The activity sends
 * statements to the simulated learning record store through the launch bridge and keeps its own
 * state document per language. Language handling matches the SCORM player.
 */
export function XapiPlayer({
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
  const bridge = useXapiBridge()
  const [running, setRunning] = useState<Running | null>(null)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [launching, setLaunching] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)

  const variants = unit.data?.variants
  const desired = variants?.find((v) => v.language === content.language) ?? variants?.[0]
  const shown = running ?? desired
  const launchData = useQuery({
    ...xapiLaunchQuery(programme, code, shown?.packageId),
    enabled: Boolean(shown),
  })
  const restart = useXapiRestart(code, shown?.packageId)

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
        ...xapiLaunchQuery(programme, code, variant.packageId),
        staleTime: 0,
      })
      bridge.install({
        simulated: true,
        label: fresh.lrs.label,
        endpoint: fresh.lrs.endpoint,
        actor: fresh.actor,
        activityId: fresh.activityId,
        state: fresh.state.location ? fresh.state : null,
        send: async (statement) => {
          const result = await xapi.recordStatement(code, {
            programme,
            packageId: variant.packageId,
            statement,
          })
          if (result.completedNow) {
            toast.success(t('player.passedToast', { title }))
            void invalidate()
          }
          void queryClient.invalidateQueries({ queryKey: ['learning', 'xapi'] })
        },
        save: (location, json) =>
          xapi.saveState(code, {
            programme,
            packageId: variant.packageId,
            location,
            suspendData: json,
          }),
      })
      setRunning(variant)
    },
    [bridge, code, invalidate, programme, queryClient, t, title],
  )

  const switcher = useLanguageSwitch({
    programme,
    code,
    variants: variants ?? [],
    positionUnit: 'step',
    save: () => bridge.flush(frameRef.current),
    onSwitched: (variant) => {
      setRunning(null)
      void launchVariant(variant)
    },
  })
  const { request, open: promptOpen } = switcher

  useEffect(() => {
    if (running && !promptOpen && content.language !== running.language) {
      void request(running, content.language)
    }
  }, [content.language, running, promptOpen, request])

  const cancelSwitch = () => {
    if (running) content.setPreference(running.language)
    switcher.cancel()
  }

  // The activity's own "Save and exit" posts this after it has saved its state.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if ((event.data as { type?: string } | null)?.type === 'qta-xapi-exit') {
        setRunning(null)
        bridge.uninstall()
        void invalidate()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [bridge, invalidate])

  if (unit.isLoading || (shown && launchData.isLoading)) {
    return <Skeleton className="aspect-[16/10] w-full rounded-xl" />
  }
  if (unit.error || !unit.data || !desired || !shown) {
    return <LoadError error={unit.error} onRetry={() => void unit.refetch()} />
  }
  if (launchData.error || !launchData.data) {
    return <LoadError error={launchData.error} onRetry={() => void launchData.refetch()} />
  }
  const lib = unit.data
  const launch = launchData.data
  const versionLabel = (language: ContentLanguage) =>
    t(language === 'ar' ? 'language.versionAr' : 'language.versionEn')

  const start = async () => {
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
    setRunning(null)
    bridge.uninstall()
    void invalidate()
    void queryClient.invalidateQueries({ queryKey: ['learning', 'library'] })
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
      t('player.creditOnce', { version: versionLabel(completedBy?.language ?? desired.language) }),
    )
  }
  if (sibling && siblingPlan.data) {
    notes.push(
      siblingPlan.data.mapped
        ? t('player.siblingMapped', {
            from: versionLabel(sibling.language),
            unit: t('position.step'),
            position: siblingPlan.data.position,
            total: siblingPlan.data.positions,
          })
        : t('player.siblingUnmapped', {
            from: versionLabel(sibling.language),
            to: versionLabel(desired.language),
          }),
    )
  }
  notes.push(t('player.lrsNote'))

  const canResume = Boolean(launch.state.location)
  const position = /(\d+)/.exec(launch.state.location)?.[1]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-teal text-white">
          <Radio aria-hidden /> {t('player.formatXapi')}
        </Badge>
        <SimulatedTag label={t('player.lrsLabel')} />
        <span className="text-xs text-muted-foreground">
          {t('player.versionLine', {
            packageId: launch.package.packageId,
            version: launch.package.version,
          })}
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
            <p className="text-xs text-muted-foreground" aria-live="polite">
              <span className="font-medium text-ink">{t('player.lrsLabel')}</span>
            </p>
            <Button size="sm" variant="outline" onClick={close}>
              <X aria-hidden /> {t('player.closeReturn')}
            </Button>
          </div>
          <iframe
            key={running.packageId}
            ref={frameRef}
            title={t('player.iframeTitle', { title, version: versionLabel(running.language) })}
            src={launch.package.launchUrl}
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
            { label: t('player.completion'), value: launch.state.completion },
            {
              label: t('player.position'),
              value: position
                ? `${t('position.step')} ${position} / ${launch.positions}`
                : t('player.start'),
            },
          ]}
          notes={notes}
          onLaunch={() => void start()}
          onRestart={() => setConfirmRestart(true)}
        />
      )}

      <section aria-labelledby="statements-heading" className="flex flex-col gap-2">
        <h2 id="statements-heading" className="font-display text-lg font-normal text-ink">
          {t('player.statementsTitle')} <SimulatedTag label={t('player.lrsLabel')} />
        </h2>
        <StatementsTable items={launch.statements.slice(0, 8)} learner />
      </section>

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
