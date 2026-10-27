import type { ApiJson } from '@/features/learning/types'
import type { api } from '@/lib/api'

export type Recommendation = ApiJson<(typeof api)['ai-path'][':programme']['$get']>
