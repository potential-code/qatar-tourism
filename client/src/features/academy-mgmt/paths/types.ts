import type { InferResponseType } from 'hono/client'
import type { adminApi } from '../hub/queries/admin-api'

type Paths = typeof adminApi.paths

export type PathsList = InferResponseType<Paths['$get'], 200>
export type PathSummary = PathsList['paths'][number]
export type RuleRow = PathsList['rules'][number]
export type PathDetail = InferResponseType<Paths[':pathId']['$get'], 200>
export type PathVersion = PathDetail['versions'][number]
export type PathItem = PathVersion['items'][number]
export type CatalogueCourse = InferResponseType<Paths['catalogue']['$get'], 200>[number]
export type Experience = InferResponseType<Paths[':pathId']['experience']['$get'], 200>
export type ExperienceItem = Experience['items'][number]
export type MatchPreview = InferResponseType<Paths['preview']['$post'], 200>
export type RuleEvaluation = MatchPreview['evaluations'][number]

/** An item being edited in the builder: a stable client key for drag-and-drop. */
export type DraftItem = Omit<PathItem, 'id' | 'position'> & { key: string }
