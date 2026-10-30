import type { ContentLanguage } from '@shared/constants'
import type { ContentPackageRow, UnitProgressRow } from '@shared/types/db'
import { ApiError, db } from '../api'
import type { Bookmark, VariantRef } from './bookmarks'
import { ITEM_SPECS, type ItemSpec, specForCourseCode, specForCourseKey } from './registry'

/**
 * Database access shared by the SCORM and xAPI services for Content Library units (C08, C09).
 * A unit has one `contentPackages` row per language variant (matched by `courseKey`); the
 * learner's bookmarks live on the unit row, one per `packageId`.
 */

export type LibraryVariant = ContentPackageRow & {
  packageId: string
  language: ContentLanguage
  courseKey: string
}

const isVariant = (p: ContentPackageRow): p is LibraryVariant =>
  p.packageId !== null && p.courseKey !== null

export function libraryVariants(courseCode: string): {
  spec: ItemSpec
  variants: LibraryVariant[]
} {
  const spec = specForCourseCode(courseCode)
  if (!spec) throw ApiError.notFound('This unit has no packages')
  const variants = db.contentPackages
    .filter(isVariant)
    .filter((p) => p.courseKey === spec.courseKey)
    .sort((a, b) => a.language.localeCompare(b.language))
  if (variants.length === 0) throw ApiError.notFound('No packages are published for this unit')
  return { spec, variants }
}

export function libraryVariant(courseCode: string, packageId: string): LibraryVariant {
  const { variants } = libraryVariants(courseCode)
  const variant = variants.find((v) => v.packageId === packageId)
  if (!variant) throw ApiError.notFound('That package is not a version of this unit')
  return variant
}

/** The variant to open when the caller names none: the one last used, else English. */
export function defaultVariant(courseCode: string, unit: UnitProgressRow | null): LibraryVariant {
  const { variants } = libraryVariants(courseCode)
  const active = unit?.extra?.activePackageId
  return (
    variants.find((v) => v.packageId === active) ??
    variants.find((v) => v.language === 'en') ??
    (variants[0] as LibraryVariant)
  )
}

export const variantRef = (variant: LibraryVariant): VariantRef => ({
  packageId: variant.packageId,
  language: variant.language,
  bookmarkSchema: (specForCourseKey(variant.courseKey) ?? ITEM_SPECS['welcoming-visitors-to-qatar'])
    .bookmarkSchema,
})

export function bookmarksOf(unit: UnitProgressRow | null): Record<string, Bookmark> {
  const raw = unit?.extra?.bookmarks
  return raw && typeof raw === 'object' ? { ...(raw as Record<string, Bookmark>) } : {}
}

/** A bookmark only counts when it was saved by a package using the schema this variant reads. */
export function usableBookmark(
  unit: UnitProgressRow | null,
  variant: LibraryVariant,
): Bookmark | null {
  const bookmark = bookmarksOf(unit)[variant.packageId]
  return bookmark && bookmark.schema === variantRef(variant).bookmarkSchema ? bookmark : null
}

export const bookmarkSummary = (bookmark: Bookmark | null) =>
  bookmark
    ? {
        location: bookmark.location,
        completion: bookmark.completion,
        success: bookmark.success,
        scoreRaw: bookmark.scoreRaw,
        savedAt: bookmark.savedAt,
        mappedFrom: bookmark.mappedFrom,
      }
    : null
