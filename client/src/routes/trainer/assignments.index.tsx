import { createFileRoute } from '@tanstack/react-router'
import { MarkingQueuePage } from '@/features/assignment-review/components/MarkingQueuePage'

export const Route = createFileRoute('/trainer/assignments/')({
  component: MarkingQueuePage,
})
