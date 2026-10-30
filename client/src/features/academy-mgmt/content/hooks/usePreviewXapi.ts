import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useXapiBridge } from '@/features/xapi-player/hooks/useXapiBridge'
import type { Bookmark, Completion } from '@/services/content-library/bookmarks'
import { previewLaunch, recordPreviewStatement } from '@/services/xapi.service'
import {
  clearPreviewBookmark,
  readPreviewBookmark,
  writePreviewBookmark,
} from '../utils/preview-store'

/**
 * Launch bridge for the admin preview of an xAPI activity. Statements go to the simulated
 * learning record store under the admin's preview identity (no learner, no unit credit); the
 * activity's state document is kept in the browser-only preview store.
 */
export function usePreviewXapi() {
  const queryClient = useQueryClient()
  const bridge = useXapiBridge()
  const { install, uninstall, flush } = bridge

  const start = useCallback(
    async (packageId: string, language: 'en' | 'ar', schema: string) => {
      const launch = await previewLaunch(packageId)
      const saved = readPreviewBookmark(packageId)
      const usable = saved && saved.schema === schema ? saved : null
      install({
        simulated: true,
        label: launch.lrs.label,
        endpoint: launch.lrs.endpoint,
        actor: launch.actor,
        activityId: launch.activityId,
        state: usable?.location
          ? { location: usable.location, suspendData: usable.suspendData }
          : null,
        send: async (statement) => {
          await recordPreviewStatement(packageId, statement)
          await queryClient.invalidateQueries({ queryKey: ['content-library', 'statements'] })
        },
        save: async (location, json) => {
          let completion: Completion = usable?.completion ?? 'incomplete'
          try {
            if ((JSON.parse(json) as { completed?: boolean }).completed) completion = 'completed'
          } catch {
            // Keep the previous completion.
          }
          const bookmark: Bookmark = {
            packageId,
            language,
            schema,
            location,
            suspendData: json,
            completion,
            success: 'unknown',
            scoreRaw: null,
            savedAt: new Date().toISOString(),
            mappedFrom: readPreviewBookmark(packageId)?.mappedFrom ?? null,
          }
          writePreviewBookmark(bookmark)
        },
      })
    },
    [install, queryClient],
  )

  const reset = useCallback((packageId: string) => clearPreviewBookmark(packageId), [])

  return { start, stop: uninstall, flush, reset }
}
