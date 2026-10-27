import type { AdminCourseUpdateInput } from '@shared/schemas/admin-catalogue'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { unwrap } from '@/lib/api'
import { adminApi } from '../../hub/queries/admin-api'

export const coursesQuery = () =>
  queryOptions({ queryKey: ['admin', 'courses'], queryFn: () => unwrap(adminApi.courses.$get()) })

export type CourseItem = Awaited<
  ReturnType<NonNullable<ReturnType<typeof coursesQuery>['queryFn']>>
>['items'][number]

export function useUpdateCourse(courseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminCourseUpdateInput) =>
      unwrap(adminApi.courses[':courseId'].$patch({ param: { courseId }, json: input })),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  })
}
