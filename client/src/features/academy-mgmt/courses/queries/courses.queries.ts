import type { AdminCourseUpdateInput } from '@shared/schemas/admin-catalogue'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as courses from '@/services/admin/courses.service'

export type { CourseItem } from '@/services/admin/courses.service'

export const coursesQuery = () =>
  queryOptions({ queryKey: ['admin', 'courses'], queryFn: () => courses.listCourses() })

export function useUpdateCourse(courseId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminCourseUpdateInput) => courses.updateCourse(courseId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  })
}
