import type { MarkingDetail, MarkingQueue } from '@/services/assignments.marking.service'

export type { MarkingDetail, MarkingQueue }
export type QueueItem = MarkingQueue['items'][number]
export type MarkerVersion = MarkingDetail['versions'][number]
export type Decision = 'returned' | 'approved'
