import { createFileRoute } from '@tanstack/react-router'
import { CertificatesPage } from '@/features/certificates/components/CertificatesPage'
import { programmeSearch } from '@/features/learning/utils/search'

export const Route = createFileRoute('/learner/certificates/')({
  validateSearch: programmeSearch,
  component: CertificatesPage,
})
