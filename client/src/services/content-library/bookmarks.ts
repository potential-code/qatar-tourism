import type { ContentLanguage } from '@shared/constants'
import type { ItemSpec } from './registry'

/**
 * Per-package bookmarks and the rules for carrying a position between language variants. Pure
 * functions, no database: the services store the result. A bookmark belongs to exactly one
 * `packageId`; it is only ever copied to another variant through `mapBookmark`, and only when
 * both variants declare the same bookmark schema.
 */
export type Completion = 'completed' | 'incomplete' | 'not attempted' | 'unknown'
export type Success = 'passed' | 'failed' | 'unknown'

export type Bookmark = {
  packageId: string
  language: ContentLanguage
  /** The bookmark layout the saving package used. Checked before any reuse. */
  schema: string
  location: string
  suspendData: string
  completion: Completion
  success: Success
  scoreRaw: number | null
  savedAt: string
  /** Set when this bookmark was created by mapping another variant's position. */
  mappedFrom: string | null
}

export type VariantRef = {
  packageId: string
  language: ContentLanguage
  /** The schema this variant's package reads and writes. */
  bookmarkSchema: string
}

/** The numeric position inside `location` (`screen-3` is 3), or 0 when there is none. */
export function positionOf(spec: Pick<ItemSpec, 'positionPrefix'>, location: string): number {
  const match = new RegExp(`${spec.positionPrefix}-(\\d+)`).exec(location)
  return match ? Number(match[1]) : 0
}

/** Equivalent positions exist only between variants that share a bookmark schema. */
export const canMapBookmark = (from: VariantRef, to: VariantRef): boolean =>
  from.packageId !== to.packageId && from.bookmarkSchema === to.bookmarkSchema

function retargetSuspendData(suspendData: string, to: VariantRef): string {
  if (!suspendData) return ''
  try {
    const data = JSON.parse(suspendData) as Record<string, unknown>
    if (data.s !== to.bookmarkSchema) return ''
    return JSON.stringify({ ...data, lang: to.language })
  } catch {
    return ''
  }
}

/**
 * The bookmark `to` should resume from after the learner moves from `from` mid-lesson. Position,
 * visited screens and answers come across (the variants have the same structure); a pass already
 * held by the target is kept. Returns null when the schemas differ or there is no position: the
 * other language then starts at the beginning, and `from` keeps its progress untouched.
 */
export function mapBookmark(
  spec: ItemSpec,
  from: Bookmark,
  to: VariantRef,
  existing: Bookmark | null,
  nowIso: string,
): Bookmark | null {
  if (!canMapBookmark({ ...from, bookmarkSchema: from.schema }, to)) return null
  if (positionOf(spec, from.location) < 1) return null
  const keepPassed = existing?.completion === 'completed' && existing.success === 'passed'
  return {
    packageId: to.packageId,
    language: to.language,
    schema: to.bookmarkSchema,
    location: from.location,
    suspendData: retargetSuspendData(from.suspendData, to),
    completion: keepPassed ? 'completed' : from.completion,
    success: keepPassed ? 'passed' : from.success,
    scoreRaw: Math.max(from.scoreRaw ?? 0, existing?.scoreRaw ?? 0) || null,
    savedAt: nowIso,
    mappedFrom: from.packageId,
  }
}

export type SwitchPlan = {
  from: string
  to: string
  language: ContentLanguage
  /** True when the other version can continue at the equivalent position. */
  mapped: boolean
  /** The equivalent position (1-based) when mapped, else 0 (start of the other version). */
  position: number
  positions: number
}

/** What a switch would do, without changing anything: drives the confirmation prompt. */
export function planSwitch(
  spec: ItemSpec,
  from: Bookmark | null,
  fromRef: VariantRef,
  toRef: VariantRef,
): SwitchPlan {
  const position = from ? positionOf(spec, from.location) : 0
  const mapped = position > 0 && canMapBookmark(fromRef, toRef)
  return {
    from: fromRef.packageId,
    to: toRef.packageId,
    language: toRef.language,
    mapped,
    position: mapped ? position : 0,
    positions: spec.positions,
  }
}
