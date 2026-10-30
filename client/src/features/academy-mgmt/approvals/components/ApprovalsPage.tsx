import { InProgress } from '@/components/layout/InProgress'
import { ManagePage } from '../../hub/components/ManagePage'

/** Enrolments and Approvals (SPEC §5). Foundation stub: the owning lane replaces the body, keeping the ManagePage frame. */
export function ApprovalsPage() {
  return (
    <ManagePage
      title="Enrolments and Approvals"
      description="Pending approvals, waitlists and locked accounts."
    >
      <InProgress />
    </ManagePage>
  )
}
