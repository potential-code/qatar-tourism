import { createFileRoute } from '@tanstack/react-router'
import { MarkingDetailPage } from '@/features/assignment-review/components/MarkingDetailPage'

export const Route = createFileRoute('/trainer/assignments/$submissionId')({
  component: function MarkingDetailRoute() {
    const { submissionId } = Route.useParams()
    return <MarkingDetailPage submissionId={submissionId} />
  },
})
