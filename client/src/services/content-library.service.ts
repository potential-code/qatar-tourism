import type { ProgrammeCode } from '@shared/constants'
import { courseCodeParam, programmeQuery } from '@shared/schemas/learning-engine'
import { z } from 'zod'
import {
  db,
  delay,
  nowIso,
  out,
  parseInput,
  requireCapability,
  requireRole,
  commit as save,
  updateRow,
} from './api'
import { audit } from './audit.service'
import { type Bookmark, mapBookmark, planSwitch } from './content-library/bookmarks'
import { LANGUAGE_NAME } from './content-library/registry'
import {
  bookmarkSummary,
  bookmarksOf,
  defaultVariant,
  libraryVariant,
  libraryVariants,
  usableBookmark,
  variantRef,
} from './content-library/store'
import { requireUnitContext } from './progress/units'

/**
 * Content Library (29 Oct): the learner's view of a unit that has English and Arabic packages,
 * the language switch with its bookmark mapping, and the admin catalogue. Bookmarks are kept per
 * package on the unit row; a switch never resets the enrolment, never adds a second completion
 * and never lends one package's bookmark to a package with a different bookmark schema.
 */

const packageIdSchema = z.string().regex(/^[a-z0-9-]{3,40}$/)
const switchBody = z.object({
  programme: z.enum(['A', 'B', 'C']),
  from: packageIdSchema,
  to: packageIdSchema,
})
export type SwitchBody = z.infer<typeof switchBody>

/** The unit's variants with the signed-in learner's bookmark on each, and the credit state. */
export async function getLibraryUnit(programme: ProgrammeCode, code: string) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  parseInput(programmeQuery, { programme }, 'query')
  const { spec, variants } = libraryVariants(code)
  const { unit } = requireUnitContext(learnerId, programme, code)
  const active = defaultVariant(code, unit)
  return out({
    courseKey: spec.courseKey,
    format: spec.format,
    positions: spec.positions,
    passMark: spec.passMark,
    activePackageId: active.packageId,
    credit: {
      completed: unit?.status === 'completed',
      completedAt: unit?.completedAt ?? null,
      completedPackageId: (unit?.extra?.completedPackageId as string | undefined) ?? null,
    },
    variants: variants.map((v) => ({
      packageId: v.packageId,
      language: v.language,
      title: v.title,
      version: v.version,
      launchUrl: v.launchUrl,
      bookmark: bookmarkSummary(usableBookmark(unit, v)),
    })),
  })
}

export type LibraryUnit = Awaited<ReturnType<typeof getLibraryUnit>>

function resolveSwitch(body: SwitchBody, code: string, learnerId: string) {
  const from = libraryVariant(code, body.from)
  const to = libraryVariant(code, body.to)
  const { spec } = libraryVariants(code)
  const ctx = requireUnitContext(learnerId, body.programme, code)
  const source = usableBookmark(ctx.unit, from)
  const plan = planSwitch(spec, source, variantRef(from), variantRef(to))
  return { from, to, spec, ctx, source, plan }
}

/** What switching would do. Nothing changes; the player shows it in the confirmation prompt. */
export async function planLanguageSwitch(code: string, input: SwitchBody) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(courseCodeParam, { code }, 'param')
  const body = parseInput(switchBody, input)
  const { to, ctx, plan } = resolveSwitch(body, code, learnerId)
  return out({
    ...plan,
    language: to.language,
    targetHasProgress: Boolean(usableBookmark(ctx.unit, to)),
  })
}

/**
 * Applies a switch. The source bookmark must already be saved (the player commits first). When
 * both variants share a bookmark schema the equivalent position is written to the target's own
 * bookmark; otherwise the target keeps whatever it had (usually nothing: it starts at the
 * beginning) and the source bookmark is left exactly as it was.
 */
export async function switchLanguage(code: string, input: SwitchBody) {
  await delay()
  const user = requireRole('learner')
  parseInput(courseCodeParam, { code }, 'param')
  const body = parseInput(switchBody, input)
  const { to, spec, ctx, source, plan } = resolveSwitch(body, code, user.id)
  const unit = ctx.unit
  if (!unit) return out({ ...plan, applied: false })

  const bookmarks = bookmarksOf(unit)
  if (source) {
    const mapped = mapBookmark(spec, source, variantRef(to), usableBookmark(unit, to), nowIso())
    if (mapped) bookmarks[to.packageId] = mapped
  }
  updateRow(unit, { extra: { ...(unit.extra ?? {}), bookmarks, activePackageId: to.packageId } })
  audit({
    action: 'content.language_switch',
    objectType: 'unit',
    objectId: code,
    before: { packageId: body.from },
    after: {
      packageId: body.to,
      language: to.language,
      mapped: plan.mapped,
      position: plan.position,
    },
    reason: null,
  })
  save()
  return out({ ...plan, applied: true })
}

// --- Admin catalogue ----------------------------------------------------------------------------

export async function listLibrary() {
  await delay()
  requireCapability('content.manage')
  const packages = db.contentPackages.filter((p) => p.packageId !== null && p.courseKey !== null)
  const keys = [...new Set(packages.map((p) => p.courseKey as string))]
  const items = keys.map((courseKey) => {
    const variants = packages
      .filter((p) => p.courseKey === courseKey)
      .sort((a, b) => (a.language === 'en' ? -1 : b.language === 'en' ? 1 : 0))
    const first = variants[0]
    const course = db.courses.find((c) => c.id === first?.courseId)
    return {
      courseKey,
      courseCode: course?.code ?? '',
      title: variants.find((v) => v.language === 'en')?.title ?? first?.title ?? courseKey,
      type: first?.type ?? 'scorm_2004',
      formatLabel: first?.formatLabel ?? '',
      variants: variants.map((v) => ({
        packageId: v.packageId as string,
        language: v.language,
        title: v.title,
        version: v.version,
        launchUrl: v.launchUrl,
        accessGroup: v.accessGroup,
        publishedAt: v.publishedAt,
        languageName: LANGUAGE_NAME[v.language].name,
      })),
    }
  })
  return out({ items })
}

export type LibraryItem = Awaited<ReturnType<typeof listLibrary>>['items'][number]
export type { Bookmark }
