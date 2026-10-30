import { useCallback, useEffect, useRef, useState } from 'react'
import { Scorm2004API } from 'scorm-again/scorm2004'
import type { Bookmark, Completion, Success } from '@/services/content-library/bookmarks'
import {
  clearPreviewBookmark,
  readPreviewBookmark,
  writePreviewBookmark,
} from '../utils/preview-store'

/** The CMI values the tracking test shows. */
export type PreviewTracking = {
  launches: number
  entry: 'ab-initio' | 'resume' | null
  location: string
  completion: string
  success: string
  scoreRaw: number | null
  suspendBytes: number
  commits: number
  lastCommitAt: string | null
}

const EMPTY: PreviewTracking = {
  launches: 0,
  entry: null,
  location: '',
  completion: 'not attempted',
  success: 'unknown',
  scoreRaw: null,
  suspendBytes: 0,
  commits: 0,
  lastCommitAt: null,
}

declare global {
  interface Window {
    API_1484_11?: unknown
  }
}

/**
 * A scorm-again runtime for the admin preview. Same host contract as the learner player
 * (`API_1484_11`), but every Commit goes to the browser-only preview store, not to a learner.
 */
export function usePreviewScorm() {
  const [tracking, setTracking] = useState<PreviewTracking>(EMPTY)
  const apiRef = useRef<Scorm2004API | null>(null)
  const launches = useRef(0)
  const commits = useRef(0)

  const start = useCallback((packageId: string, language: 'en' | 'ar', schema: string) => {
    const saved = readPreviewBookmark(packageId)
    const usable = saved && saved.schema === schema ? saved : null
    const api = new Scorm2004API({ lmsCommitUrl: false, autocommit: false, logLevel: 5 })
    const resumable = Boolean(usable?.location || usable?.suspendData)
    api.loadFromJSON({
      cmi: {
        entry: resumable ? 'resume' : 'ab-initio',
        location: usable?.location ?? '',
        suspend_data: usable?.suspendData ?? '',
        completion_status: usable?.completion ?? 'not attempted',
        success_status: usable?.success ?? 'unknown',
        ...(usable?.scoreRaw != null ? { score: { raw: String(usable.scoreRaw) } } : {}),
      },
    })
    const persist = () => {
      const cmi = api.cmi
      const score = cmi.score.raw === '' ? null : Number(cmi.score.raw)
      const now = new Date().toISOString()
      const bookmark: Bookmark = {
        packageId,
        language,
        schema,
        location: cmi.location ?? '',
        suspendData: cmi.suspend_data ?? '',
        completion: (cmi.completion_status || 'unknown') as Completion,
        success: (cmi.success_status || 'unknown') as Success,
        scoreRaw: Number.isFinite(score) ? score : null,
        savedAt: now,
        mappedFrom: usable?.mappedFrom ?? null,
      }
      writePreviewBookmark(bookmark)
      commits.current += 1
      setTracking({
        launches: launches.current,
        entry: resumable ? 'resume' : 'ab-initio',
        location: bookmark.location,
        completion: bookmark.completion,
        success: bookmark.success,
        scoreRaw: bookmark.scoreRaw,
        suspendBytes: bookmark.suspendData.length,
        commits: commits.current,
        lastCommitAt: now,
      })
    }
    api.on('Commit', persist)
    api.on('Terminate', persist)
    launches.current += 1
    commits.current = 0
    apiRef.current = api
    window.API_1484_11 = api
    setTracking({
      ...EMPTY,
      launches: launches.current,
      entry: resumable ? 'resume' : 'ab-initio',
      location: usable?.location ?? '',
      completion: usable?.completion ?? 'not attempted',
      success: usable?.success ?? 'unknown',
      scoreRaw: usable?.scoreRaw ?? null,
      suspendBytes: usable?.suspendData.length ?? 0,
    })
  }, [])

  /** Asks the package to commit now. The preview store write is synchronous. */
  const flush = useCallback(async (frame: HTMLIFrameElement | null) => {
    const content = (
      frame?.contentWindow as (Window & { QTAContent?: { saveNow: () => unknown } }) | null
    )?.QTAContent
    content?.saveNow()
  }, [])

  const stop = useCallback(() => {
    apiRef.current = null
    if (window.API_1484_11) delete window.API_1484_11
  }, [])

  const reset = useCallback((packageId: string) => {
    clearPreviewBookmark(packageId)
    setTracking({ ...EMPTY, launches: launches.current })
  }, [])

  useEffect(() => stop, [stop])

  return { tracking, start, stop, flush, reset }
}
