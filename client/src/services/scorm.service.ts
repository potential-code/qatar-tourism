import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import {
  courseCodeParam,
  programmeQuery,
  type ScormCommitBody,
  scormCommitBody,
  scormRestartBody,
} from '@shared/schemas/learning-engine'
import type { UnitProgressRow } from '@shared/types/db'
import {
  ApiError,
  db,
  delay,
  nowIso,
  out,
  parseInput,
  requireRole,
  commit as save,
  updateRow,
} from './api'
import type { Bookmark, Completion, Success } from './content-library/bookmarks'
import { positionOf } from './content-library/bookmarks'
import { specForCourseCode } from './content-library/registry'
import {
  bookmarksOf,
  defaultVariant,
  type LibraryVariant,
  libraryVariant,
  usableBookmark,
  variantRef,
} from './content-library/store'
import { recomputeEnrolment } from './progress/recompute'
import { requireUnitContext, writeUnit } from './progress/units'

/**
 * SCORM 2004 runtime persistence for the sample package (brief §8), formerly
 * server/modules/scorm. The page runs scorm-again; this service stores the CMI fields on the
 * unit progress row, maps the outcome to the unit and the enrolment, and counts a reported pass
 * exactly once. The signed-in learner's own attempt only.
 */

const MAX_LAUNCHES = 50

/**
 * Content Library SCORM units (C08): the package is the language variant the learner opened
 * (`packageId`), and the resume data is that package's own bookmark, never another language's.
 */
function libraryScorm(code: string, packageId: string | undefined, unit: UnitProgressRow | null) {
  const spec = specForCourseCode(code)
  if (!spec) return null
  if (spec.format !== 'scorm_2004') throw ApiError.notFound('No SCORM package for this unit')
  const variant: LibraryVariant = packageId
    ? libraryVariant(code, packageId)
    : defaultVariant(code, unit)
  if (variant.type !== 'scorm_2004' || !variant.launchUrl) {
    throw ApiError.notFound('No SCORM package for this unit')
  }
  return { spec, variant }
}

/** The current SCORM 2004 package behind a course. Only SCORM packages have a runtime. */
function scormPackage(code: string) {
  const course = db.courses.find((c) => c.code === code)
  const pkg = course
    ? db.contentPackages.find((p) => p.courseId === course.id && p.isCurrent)
    : undefined
  if (pkg?.type !== 'scorm_2004' || !pkg.launchUrl) {
    throw ApiError.notFound('No SCORM package for this unit')
  }
  return {
    title: pkg.title,
    type: pkg.type,
    version: pkg.version,
    launchUrl: pkg.launchUrl,
    formatLabel: pkg.formatLabel,
  }
}

const sceneNumber = (location: string | null | undefined) => {
  const match = /scene-(\d+)/.exec(location ?? '')
  return match ? Number(match[1]) : 0
}

/** CMI values to initialise the runtime with, so closing and reopening resumes (brief §8). */
export async function getState(programme: ProgrammeCode, code: string, packageId?: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  parseInput(programmeQuery, { programme }, 'query')
  const { unit } = requireUnitContext(learnerId, programme, code)
  const lib = libraryScorm(code, packageId, unit)
  if (lib) {
    const bookmark = usableBookmark(unit, lib.variant)
    const resumable = Boolean(bookmark?.location || bookmark?.suspendData)
    return out({
      package: {
        title: lib.variant.title,
        type: lib.variant.type,
        version: lib.variant.version,
        launchUrl: lib.variant.launchUrl as string,
        formatLabel: lib.variant.formatLabel,
        packageId: lib.variant.packageId as string | null,
        language: lib.variant.language as string | null,
      },
      cmi: {
        entry: resumable ? ('resume' as const) : ('ab-initio' as const),
        location: bookmark?.location ?? '',
        suspendData: bookmark?.suspendData ?? '',
        completionStatus: bookmark?.completion ?? 'not attempted',
        successStatus: bookmark?.success ?? 'unknown',
        scoreRaw: bookmark?.scoreRaw ?? null,
        totalTimeSeconds: unit?.sessionTimeSeconds ?? 0,
      },
      unit: {
        status: unit?.status ?? 'not_started',
        percent: unit?.percent ?? 0,
        completedAt: unit?.completedAt ?? null,
      },
    })
  }
  const pkg = scormPackage(code)
  const resumable = Boolean(unit?.location || unit?.suspendData)
  return out({
    package: { ...pkg, packageId: null as string | null, language: null as string | null },
    cmi: {
      entry: resumable ? ('resume' as const) : ('ab-initio' as const),
      location: unit?.location ?? '',
      suspendData: unit?.suspendData ?? '',
      completionStatus: unit?.cmiCompletionStatus ?? 'not attempted',
      successStatus: unit?.cmiSuccessStatus ?? 'unknown',
      scoreRaw: unit?.scoreRaw ?? null,
      totalTimeSeconds: unit?.sessionTimeSeconds ?? 0,
    },
    unit: {
      status: unit?.status ?? 'not_started',
      percent: unit?.percent ?? 0,
      completedAt: unit?.completedAt ?? null,
    },
  })
}

export type ScormState = Awaited<ReturnType<typeof getState>>

/**
 * Persists one Commit. The unit completes when the package reports completed AND passed with
 * at least the module pass mark; `writeUnit` sets `completedAt` only the first time.
 */
export async function commit(code: string, input: ScormCommitBody) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  const body = parseInput(scormCommitBody, input)
  const ctx = requireUnitContext(learnerId, body.programme, code)
  const lib = libraryScorm(code, body.packageId, ctx.unit)
  if (lib && !body.packageId) throw ApiError.badRequest('Say which language version this is')
  if (!lib) scormPackage(code)
  const extra = ctx.unit?.extra ?? {}
  const launches = { ...((extra.launches ?? {}) as Record<string, number>) }
  launches[body.launchId] = Math.max(launches[body.launchId] ?? 0, body.sessionTimeSeconds ?? 0)
  const kept = Object.entries(launches).slice(-MAX_LAUNCHES)
  const totalSeconds = kept.reduce((sum, [, seconds]) => sum + seconds, 0)

  const score = body.scoreRaw ?? ctx.unit?.scoreRaw ?? null
  const passMark = lib?.spec.passMark ?? THRESHOLDS.moduleQuizPass
  const passed =
    body.cmiCompletionStatus === 'completed' &&
    body.cmiSuccessStatus === 'passed' &&
    (score ?? 0) >= passMark

  if (lib) {
    // Library units keep one bookmark per package and count the pass once for the unit.
    const ref = variantRef(lib.variant)
    const bookmark: Bookmark = {
      packageId: ref.packageId,
      language: ref.language,
      schema: ref.bookmarkSchema,
      location: body.location ?? '',
      suspendData: body.suspendData ?? '',
      completion: body.cmiCompletionStatus as Completion,
      success: (body.cmiSuccessStatus ?? 'unknown') as Success,
      scoreRaw: body.scoreRaw ?? null,
      savedAt: nowIso(),
      mappedFrom: usableBookmark(ctx.unit, lib.variant)?.mappedFrom ?? null,
    }
    const bookmarks = { ...bookmarksOf(ctx.unit), [ref.packageId]: bookmark }
    const wasComplete = ctx.unit?.status === 'completed'
    const position = positionOf(lib.spec, bookmark.location)
    const result = writeUnit(ctx, {
      cmiCompletionStatus: wasComplete ? 'completed' : body.cmiCompletionStatus,
      cmiSuccessStatus: wasComplete ? 'passed' : (body.cmiSuccessStatus ?? 'unknown'),
      scoreRaw: Math.max(ctx.unit?.scoreRaw ?? 0, body.scoreRaw ?? 0) || null,
      sessionTimeSeconds: totalSeconds,
      suspendData: bookmark.suspendData,
      location: bookmark.location,
      percent: Math.round((Math.min(lib.spec.positions, position) / lib.spec.positions) * 90),
      extra: {
        ...extra,
        launches: Object.fromEntries(kept),
        bookmarks,
        activePackageId: ref.packageId,
      },
      complete: passed,
    })
    if (result.completedNow) {
      updateRow(result.unit, {
        extra: { ...(result.unit.extra ?? {}), completedPackageId: ref.packageId },
      })
    }
    const enrolmentStatus = recomputeEnrolment(learnerId, body.programme)
    save()
    return out({
      unitStatus: result.unit.status,
      completedNow: result.completedNow,
      scoreRaw: result.unit.scoreRaw,
      totalTimeSeconds: totalSeconds,
      enrolmentStatus,
    })
  }

  const result = writeUnit(ctx, {
    cmiCompletionStatus: body.cmiCompletionStatus,
    cmiSuccessStatus: body.cmiSuccessStatus ?? ctx.unit?.cmiSuccessStatus ?? 'unknown',
    scoreRaw: score,
    sessionTimeSeconds: totalSeconds,
    suspendData: body.suspendData ?? ctx.unit?.suspendData ?? null,
    location: body.location ?? ctx.unit?.location ?? null,
    percent: Math.round((Math.min(6, sceneNumber(body.location)) / 6) * 90),
    extra: { ...extra, launches: Object.fromEntries(kept) },
    complete: passed,
  })
  const enrolmentStatus = recomputeEnrolment(learnerId, body.programme)
  save()
  return out({
    unitStatus: result.unit.status,
    completedNow: result.completedNow,
    scoreRaw: result.unit.scoreRaw,
    totalTimeSeconds: totalSeconds,
    enrolmentStatus,
  })
}

/** Restart with confirmation: clears the resume point. A counted pass is never undone. */
export async function restart(programme: ProgrammeCode, code: string, packageId?: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  parseInput(scormRestartBody, { programme })
  const ctx = requireUnitContext(learnerId, programme, code)
  const lib = libraryScorm(code, packageId, ctx.unit)
  if (!lib) scormPackage(code)
  if (!ctx.unit) return out({ restarted: true as const })
  if (lib) {
    // Only this language's bookmark is cleared; the other version and any pass are untouched.
    const bookmarks = bookmarksOf(ctx.unit)
    delete bookmarks[lib.variant.packageId]
    updateRow(ctx.unit, { extra: { ...(ctx.unit.extra ?? {}), bookmarks } })
    save()
    return out({ restarted: true as const })
  }
  writeUnit(ctx, {
    location: null,
    suspendData: null,
    cmiCompletionStatus: ctx.unit.status === 'completed' ? 'completed' : 'not attempted',
  })
  save()
  return out({ restarted: true as const })
}
