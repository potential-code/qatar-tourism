import { createFileRoute } from '@tanstack/react-router'
import { CertificateDetailPage } from '@/features/certificates/components/CertificateDetailPage'

export const Route = createFileRoute('/learner/certificates/$code')({
  component: function CertificateRoute() {
    const { code } = Route.useParams()
    return <CertificateDetailPage code={code} />
  },
})
