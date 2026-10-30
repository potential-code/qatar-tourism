import type { ContentLanguage } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LanguageSwitchPrompt,
  type SwitchPromptPlan,
} from '@/features/scorm-player/components/LanguageSwitchPrompt'
import { StatementsTable } from '@/features/xapi-player/components/StatementsTable'
import { adminStatementsQuery } from '@/features/xapi-player/queries/xapi.queries'
import { mapBookmark, planSwitch } from '@/services/content-library/bookmarks'
import { specForCourseKey } from '@/services/content-library/registry'
import type { LibraryItem } from '@/services/content-library.service'
import { usePreviewScorm } from '../hooks/usePreviewScorm'
import { usePreviewXapi } from '../hooks/usePreviewXapi'
import {
  clearPreviewBookmark,
  readPreviewBookmark,
  writePreviewBookmark,
} from '../utils/preview-store'
import { PackageDetails } from './PackageDetails'
import { ScormTracking } from './ScormTracking'

export type PreviewTab = 'tracking' | 'details'
type Variant = LibraryItem['variants'][number]

/**
 * Opens the real package in a preview frame with a language choice, and the tracking test beside
 * it: SCORM launch, resume, score and completion values, or the simulated LRS statements table.
 * The English to Arabic switch uses the same saved-progress prompt and position mapping as the
 * learner player. Preview data stays in this browser; no learner record changes.
 */
export function PackagePreviewDialog({
  item,
  initialLanguage,
  initialTab,
  onClose,
}: {
  item: LibraryItem
  initialLanguage: ContentLanguage
  initialTab: PreviewTab
  onClose: () => void
}) {
  const spec = specForCourseKey(item.courseKey)
  const isScorm = item.type === 'scorm_2004'
  const scorm = usePreviewScorm()
  const xapi = usePreviewXapi()
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [running, setRunning] = useState<Variant | null>(null)
  const [tab, setTab] = useState<PreviewTab>(initialTab)
  const [pending, setPending] = useState<{
    to: Variant
    plan: SwitchPromptPlan | null
    saving: boolean
    error: boolean
  } | null>(null)
  const statements = useQuery({
    ...adminStatementsQuery(running?.packageId ?? ''),
    enabled: !isScorm && Boolean(running),
  })

  const schema = spec?.bookmarkSchema ?? ''
  const refOf = (v: Variant) => ({
    packageId: v.packageId,
    language: v.language,
    bookmarkSchema: schema,
  })

  const launch = useCallback(
    async (variant: Variant) => {
      if (isScorm) scorm.start(variant.packageId, variant.language, schema)
      else await xapi.start(variant.packageId, variant.language, schema)
      setRunning(variant)
    },
    [isScorm, schema, scorm.start, xapi.start],
  )

  // Launch the chosen language when the dialog opens.
  useEffect(() => {
    const variant = item.variants.find((v) => v.language === initialLanguage) ?? item.variants[0]
    if (variant) void launch(variant)
  }, [item.variants, initialLanguage, launch])

  // Remove the runtime when the dialog closes.
  useEffect(
    () => () => {
      scorm.stop()
      xapi.stop()
    },
    [scorm.stop, xapi.stop],
  )

  const requestLanguage = async (language: ContentLanguage) => {
    const to = item.variants.find((v) => v.language === language)
    if (!to || !running || to.packageId === running.packageId || !spec) return
    setPending({ to, plan: null, saving: true, error: false })
    try {
      await (isScorm ? scorm.flush(frameRef.current) : xapi.flush(frameRef.current))
      const source = readPreviewBookmark(running.packageId)
      const plan = planSwitch(spec, source, refOf(running), refOf(to))
      setPending({
        to,
        saving: false,
        error: false,
        plan: {
          language: to.language,
          mapped: plan.mapped,
          position: plan.position,
          positions: plan.positions,
          unit: spec.positionPrefix,
        },
      })
    } catch {
      setPending({ to, plan: null, saving: false, error: true })
    }
  }

  const confirmSwitch = async () => {
    if (!pending || !running || !spec) return
    const source = readPreviewBookmark(running.packageId)
    if (source) {
      const mapped = mapBookmark(
        spec,
        source,
        refOf(pending.to),
        readPreviewBookmark(pending.to.packageId),
        new Date().toISOString(),
      )
      if (mapped) writePreviewBookmark(mapped)
    }
    const to = pending.to
    setPending(null)
    setRunning(null)
    scorm.stop()
    xapi.stop()
    await launch(to)
  }

  const resetTest = async () => {
    if (!running) return
    clearPreviewBookmark(running.packageId)
    scorm.reset(running.packageId)
    xapi.reset(running.packageId)
    const variant = running
    setRunning(null)
    scorm.stop()
    xapi.stop()
    await launch(variant)
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Preview: {item.title}</DialogTitle>
          <DialogDescription>
            The real package, running in a preview frame. Preview data stays in this browser and
            changes no learner record.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <p id="preview-language-label" className="text-sm font-medium text-ink">
              Preview language
            </p>
            <SegmentedControl
              aria-labelledby="preview-language-label"
              value={running?.language ?? initialLanguage}
              onValueChange={(next) => void requestLanguage(next as ContentLanguage)}
              disabled={!running || pending !== null}
            >
              <SegmentedControlItem value="en" lang="en">
                English
              </SegmentedControlItem>
              <SegmentedControlItem value="ar" lang="ar">
                العربية
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void resetTest()}
              disabled={!running}
            >
              <RotateCcw aria-hidden /> Reset test data
            </Button>
            {running?.launchUrl ? (
              <Button variant="ghost" size="sm" asChild>
                <a href={running.launchUrl} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden /> Open without LMS
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border bg-white">
            {running?.launchUrl ? (
              <iframe
                key={running.packageId}
                ref={frameRef}
                title={`Preview: ${running.title}`}
                src={running.launchUrl}
                lang={running.language}
                sandbox="allow-scripts allow-same-origin"
                className="block h-[70dvh] min-h-[30rem] w-full bg-sand"
              />
            ) : (
              <div className="grid h-[30rem] place-items-center text-sm text-muted-foreground">
                Starting preview...
              </div>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as PreviewTab)} className="min-w-0">
            <TabsList>
              <TabsTrigger value="tracking">Tracking test</TabsTrigger>
              <TabsTrigger value="details">Package</TabsTrigger>
            </TabsList>
            <TabsContent value="tracking" className="mt-3 flex flex-col gap-3">
              {isScorm ? (
                <ScormTracking tracking={scorm.tracking} positions={spec?.positions ?? 0} />
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <SimulatedTag label="Simulated learning record store" />
                    Statements below are stored in the demo, not sent anywhere.
                  </p>
                  <StatementsTable items={statements.data?.items ?? []} showActor />
                </div>
              )}
            </TabsContent>
            <TabsContent value="details" className="mt-3">
              {running ? <PackageDetails item={item} variant={running} /> : null}
            </TabsContent>
          </Tabs>
        </div>

        <LanguageSwitchPrompt
          open={pending !== null}
          plan={pending?.plan ?? null}
          saving={pending?.saving ?? false}
          pending={false}
          error={pending?.error ?? false}
          onConfirm={() => void confirmSwitch()}
          onCancel={() => setPending(null)}
        />
      </DialogContent>
    </Dialog>
  )
}
