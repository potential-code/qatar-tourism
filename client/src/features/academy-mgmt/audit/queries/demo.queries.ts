import { queryOptions, useMutation } from '@tanstack/react-query'
import * as demo from '@/services/demo.service'

export const demoMetaQuery = () =>
  queryOptions({ queryKey: ['demo', 'meta'], queryFn: demo.getDemoMeta })

/** Restores the snapshot. The global mutation invalidation then refetches every screen. */
export function useResetDemo() {
  return useMutation({ mutationFn: demo.resetDemoData })
}
