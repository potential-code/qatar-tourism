import { createFileRoute } from '@tanstack/react-router'
import { CoursesPage } from '@/features/academy-mgmt/courses/components/CoursesPage'

export const Route = createFileRoute('/admin/manage/courses')({
  component: CoursesPage,
})
