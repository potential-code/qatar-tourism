import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export const demoMetaQuery = () =>
  queryOptions({ queryKey: ['demo', 'meta'], queryFn: () => unwrap(api.demo.meta.$get()) })

/** Restores the snapshot, then refetches every query: every screen shows the reset data. */
export function useResetDemo() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(api.demo.reset.$post({ json: { confirm: true } })),
    onSuccess: () => client.invalidateQueries(),
  })
}
