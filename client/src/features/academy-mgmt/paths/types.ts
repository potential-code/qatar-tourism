import type { Experience, MatchPreview } from '@/services/admin/path-rules.service'
import type { PathDetail, PathsList } from '@/services/admin/paths.service'

export type { CatalogueCourse } from '@/services/admin/paths.service'
export type { Experience, MatchPreview, PathDetail, PathsList }

export type PathSummary = PathsList['paths'][number]
export type RuleRow = PathsList['rules'][number]
export type PathVersion = PathDetail['versions'][number]
export type PathItem = PathVersion['items'][number]
export type ExperienceItem = Experience['items'][number]
export type RuleEvaluation = MatchPreview['evaluations'][number]

/** An item being edited in the builder: a stable client key for drag-and-drop. */
export type DraftItem = Omit<PathItem, 'id' | 'position'> & { key: string }
