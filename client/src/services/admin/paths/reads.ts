import type { PathItemRow } from '@shared/types/db'
import { db, findOr404, indexBy } from '../../api'

/**
 * Path builder reads shared by the paths and path-rules services: a path with its programme,
 * every version with items and enrolment counts, and the assignment rules.
 */

export type ItemView = {
  id: string
  position: number
  kind: PathItemRow['kind']
  courseId: string | null
  courseCode: string | null
  scenarioKey: string | null
  title: string
  required: boolean
  level: number
  stage: string
  note: string | null
}

/** An item to insert: positions are assigned in order, course codes are joined on read. */
export type NewItem = Omit<ItemView, 'id' | 'courseCode' | 'position'>

export function itemsOf(versionIds: readonly string[]): Map<string, ItemView[]> {
  const wanted = new Set(versionIds)
  const courses = indexBy(db.courses, (c) => c.id)
  const map = new Map<string, ItemView[]>()
  const rows = db.pathItems
    .filter((i) => wanted.has(i.pathVersionId))
    .sort((a, b) => a.position - b.position)
  for (const row of rows) {
    const list = map.get(row.pathVersionId) ?? []
    list.push({
      id: row.id,
      position: row.position,
      kind: row.kind,
      courseId: row.courseId,
      courseCode: row.courseId ? (courses.get(row.courseId)?.code ?? null) : null,
      scenarioKey: row.scenarioKey,
      title: row.title,
      required: row.required,
      level: row.level,
      stage: row.stage,
      note: row.note,
    })
    map.set(row.pathVersionId, list)
  }
  return map
}

/** A path with its programme code and title. 404 when unknown. */
export function pathRow(pathId: string) {
  const path = findOr404(db.learningPaths, (p) => p.id === pathId, 'Learning path not found')
  const programme = findOr404(
    db.programmes,
    (p) => p.id === path.programmeId,
    'Programme not found',
  )
  return {
    id: path.id,
    code: path.code,
    name: path.name,
    description: path.description,
    isDefault: path.isDefault,
    currentVersionId: path.currentVersionId,
    programmeId: path.programmeId,
    programme: programme.code,
    programmeTitle: programme.title,
  }
}

/** A path with every version (newest first), their items and their enrolment counts. */
export function pathDetail(pathId: string) {
  const path = pathRow(pathId)
  const users = indexBy(db.users, (u) => u.id)
  const versions = db.pathVersions
    .filter((v) => v.pathId === pathId)
    .sort((a, b) => b.version - a.version)
  const items = itemsOf(versions.map((v) => v.id))
  const enrolments = db.enrolments.filter((e) => e.pathId === pathId)
  const statusCounts = (versionId: string) => {
    const mine = enrolments.filter((e) => e.pathVersionId === versionId)
    const of = (status: string) => mine.filter((e) => e.status === status).length
    return {
      total: mine.length,
      notStarted: of('not_started'),
      inProgress: of('in_progress'),
      awaitingReview: of('awaiting_review'),
      completed: of('completed'),
    }
  }
  const { programmeId: _programmeId, ...pathView } = path
  return {
    path: pathView,
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      changeNote: v.changeNote,
      publishedAt: v.publishedAt,
      publishedBy: v.publishedBy ? (users.get(v.publishedBy)?.name ?? null) : null,
      updatedAt: v.updatedAt,
      isCurrent: v.id === path.currentVersionId,
      items: items.get(v.id) ?? [],
      enrolments: statusCounts(v.id),
    })),
  }
}

/** Every assignment rule with its programme and path, by programme then priority (highest first). */
export function listRuleRows() {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const paths = indexBy(db.learningPaths, (p) => p.id)
  return db.assignmentRules
    .flatMap((rule) => {
      const programme = programmes.get(rule.programmeId)
      const path = paths.get(rule.pathId)
      if (!programme || !path) return []
      return [
        {
          id: rule.id,
          code: rule.code,
          name: rule.name,
          summary: rule.summary,
          programme: programme.code,
          pathId: rule.pathId,
          pathName: path.name,
          pathCode: path.code,
          priority: rule.priority,
          isDefault: rule.isDefault,
          status: rule.status,
          conditions: rule.conditions,
          updatedAt: rule.updatedAt,
        },
      ]
    })
    .sort(
      (a, b) =>
        a.programme.localeCompare(b.programme) ||
        b.priority - a.priority ||
        a.name.localeCompare(b.name),
    )
}
