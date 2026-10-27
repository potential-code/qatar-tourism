import type { InferResponseType } from 'hono/client'
import type { api } from '@/lib/api'

export type MarkingQueue = InferResponseType<typeof api.assignments.marking.$get, 200>
export type QueueItem = MarkingQueue['items'][number]
export type MarkingDetail = InferResponseType<(typeof api.assignments.marking)[':id']['$get'], 200>
export type MarkerVersion = MarkingDetail['versions'][number]
export type Decision = 'returned' | 'approved'
