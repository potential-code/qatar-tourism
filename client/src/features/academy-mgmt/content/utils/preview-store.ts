import type { Bookmark } from '@/services/content-library/bookmarks'

/**
 * Bookmarks for the admin preview and tracking test. They live in this browser only (a
 * per-viewer convenience): previewing never touches a learner's record. Storage can throw (private
 * mode), so a memory copy keeps the preview working for the page.
 */
const KEY = (packageId: string) => `qta-content-preview:${packageId}`
const memory = new Map<string, Bookmark>()

export function readPreviewBookmark(packageId: string): Bookmark | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY(packageId))
    if (raw) return JSON.parse(raw) as Bookmark
  } catch {
    // Fall through to the memory copy.
  }
  return memory.get(packageId) ?? null
}

export function writePreviewBookmark(bookmark: Bookmark): void {
  memory.set(bookmark.packageId, bookmark)
  try {
    globalThis.localStorage?.setItem(KEY(bookmark.packageId), JSON.stringify(bookmark))
  } catch {
    // The memory copy is enough for this page.
  }
}

export function clearPreviewBookmark(packageId: string): void {
  memory.delete(packageId)
  try {
    globalThis.localStorage?.removeItem(KEY(packageId))
  } catch {
    // Nothing to clear.
  }
}
