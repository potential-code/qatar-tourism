import { InProgress } from '@/components/layout/InProgress'
import { ManagePage } from '../../hub/components/ManagePage'

/** Certificates and CPD (SPEC §7). Foundation stub: the owning lane replaces the body, keeping the ManagePage frame. */
export function CertificatesAdminPage() {
  return (
    <ManagePage
      title="Certificates and CPD"
      description="Templates, rules, issued credentials, renewal and external reviews."
    >
      <InProgress />
    </ManagePage>
  )
}
