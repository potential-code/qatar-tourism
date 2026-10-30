import { createFileRoute } from '@tanstack/react-router'
import { CertificatesAdminPage } from '@/features/academy-mgmt/certificates/components/CertificatesAdminPage'

export const Route = createFileRoute('/admin/manage/certificates')({
  component: CertificatesAdminPage,
})
