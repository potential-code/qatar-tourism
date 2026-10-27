import { createFileRoute } from '@tanstack/react-router'
import { AttendanceIndexPage } from '@/features/trainer-workspace/components/attendance/AttendanceIndexPage'

export const Route = createFileRoute('/trainer/attendance/')({
  component: AttendanceIndexPage,
})
