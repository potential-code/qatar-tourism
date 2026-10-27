import { createFileRoute } from '@tanstack/react-router'
import { SessionFormPage } from '@/features/trainer-workspace/components/form/SessionFormPage'

export const Route = createFileRoute('/trainer/sessions/$sessionId/edit')({
  component: function EditSessionRoute() {
    const { sessionId } = Route.useParams()
    return <SessionFormPage sessionId={sessionId} />
  },
})
