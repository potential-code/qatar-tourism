import type { ApiJson } from '@/features/learning/types'
import type { api } from '@/lib/api'

export type CertificateDetail = ApiJson<(typeof api.certificates)[':code']['$get']>
