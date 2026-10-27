import { createFileRoute } from '@tanstack/react-router'
import { AssignmentDetail } from '@/features/assignments/components/AssignmentDetail'

export const Route = createFileRoute('/learner/assignments/$code')({
  component: function AssignmentDetailRoute() {
    const { code } = Route.useParams()
    return <AssignmentDetail code={code} />
  },
})
