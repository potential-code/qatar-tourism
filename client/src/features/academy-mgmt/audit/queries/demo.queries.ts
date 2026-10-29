import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as demo from '@/services/demo.service'

export const demoMetaQuery = () =>
  queryOptions({ queryKey: ['demo', 'meta'], queryFn: demo.getDemoMeta })

/** Restores the snapshot, then refetches every query: every screen shows the reset data. */
export function useResetDemo() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: demo.resetDemoData,
    onSuccess: () => client.invalidateQueries(),
  })
}
