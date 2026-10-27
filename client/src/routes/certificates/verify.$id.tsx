import { createFileRoute } from '@tanstack/react-router'
import { VerifyPage } from '@/features/certificates/components/VerifyPage'

/** Public: anyone with a demo certificate ID can check it (brief §6). */
export const Route = createFileRoute('/certificates/verify/$id')({
  component: function VerifyRoute() {
    const { id } = Route.useParams()
    return <VerifyPage code={id} />
  },
})
