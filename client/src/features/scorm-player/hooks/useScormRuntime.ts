import type { ProgrammeCode } from '@shared/constants'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Scorm2004API } from 'scorm-again/scorm2004'
import { useScormCommit } from '../queries/scorm.queries'

export type ScormInitial = {
  entry: 'resume' | 'ab-initio'
  location: string
  suspendData: string
  completionStatus: string
  successStatus: string
  scoreRaw: number | null
}

export type LiveStatus = {
  location: string
  completion: string
  success: string
  scoreRaw: number | null
  saving: boolean
  saved: boolean
  error: boolean
}

declare global {
  interface Window {
    API_1484_11?: unknown
  }
}

const newLaunchId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `launch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

/**
 * Hosts the SCORM 2004 runtime with scorm-again (brief §8). The package, in a sandboxed
 * same-origin iframe, finds `API_1484_11` on this window. Every Commit and the Terminate are
 * persisted to the API, which stores the CMI data on `unit_progress` and counts a pass once.
 */
export function useScormRuntime(code: string, programme: ProgrammeCode, packageId?: string) {
  const commit = useScormCommit(code)
  const apiRef = useRef<Scorm2004API | null>(null)
  const launchId = useRef(newLaunchId())
  const launchedAt = useRef(Date.now())
  const packageRef = useRef(packageId)
  const inflight = useRef<Promise<unknown>>(Promise.resolve())
  const [status, setStatus] = useState<LiveStatus | null>(null)
  const { mutateAsync } = commit

  const persist = useCallback(
    (api: Scorm2004API) => {
      const cmi = api.cmi
      const score = cmi.score.raw === '' ? null : Number(cmi.score.raw)
      const body = {
        programme,
        launchId: launchId.current,
        cmiCompletionStatus: (cmi.completion_status || 'unknown') as
          | 'completed'
          | 'incomplete'
          | 'not attempted'
          | 'unknown',
        cmiSuccessStatus: (cmi.success_status || 'unknown') as 'passed' | 'failed' | 'unknown',
        scoreRaw: Number.isFinite(score) ? score : null,
        // cmi.session_time is write-only for the host, so time the launch here.
        sessionTimeSeconds: Math.round((Date.now() - launchedAt.current) / 1000),
        suspendData: cmi.suspend_data ?? '',
        location: cmi.location ?? '',
        ...(packageRef.current ? { packageId: packageRef.current } : {}),
      }
      setStatus({
        location: body.location,
        completion: body.cmiCompletionStatus,
        success: body.cmiSuccessStatus,
        scoreRaw: body.scoreRaw,
        saving: true,
        saved: false,
        error: false,
      })
      inflight.current = mutateAsync(body).then(
        () => setStatus((s) => (s ? { ...s, saving: false, saved: true } : s)),
        () => {
          setStatus((s) => (s ? { ...s, saving: false, error: true } : s))
          throw new Error('Commit failed')
        },
      )
      inflight.current.catch(() => undefined)
    },
    [mutateAsync, programme],
  )

  /** Creates a fresh runtime for one launch, primed with the saved resume data. */
  const start = useCallback(
    (initial: ScormInitial, forPackageId?: string) => {
      packageRef.current = forPackageId ?? packageId
      launchId.current = newLaunchId()
      launchedAt.current = Date.now()
      const api = new Scorm2004API({ lmsCommitUrl: false, autocommit: false, logLevel: 5 })
      api.loadFromJSON({
        cmi: {
          entry: initial.entry,
          location: initial.location,
          suspend_data: initial.suspendData,
          completion_status: initial.completionStatus,
          success_status: initial.successStatus,
          ...(initial.scoreRaw !== null ? { score: { raw: String(initial.scoreRaw) } } : {}),
        },
      })
      api.on('Commit', () => persist(api))
      api.on('Terminate', () => persist(api))
      apiRef.current = api
      window.API_1484_11 = api
      setStatus(null)
    },
    [persist, packageId],
  )

  /**
   * Commits the running package's bookmark and waits until it is stored. Used before a language
   * switch so the saved place is on record. Rejects when the save failed.
   */
  const flush = useCallback(async (frame: HTMLIFrameElement | null) => {
    const content = (
      frame?.contentWindow as (Window & { QTAContent?: { saveNow: () => unknown } }) | null
    )?.QTAContent
    content?.saveNow()
    await inflight.current
  }, [])

  const stop = useCallback(() => {
    apiRef.current = null
    if (window.API_1484_11) delete window.API_1484_11
  }, [])

  useEffect(() => stop, [stop])

  return { start, stop, flush, status, commitError: commit.error, lastCommit: commit.data }
}
