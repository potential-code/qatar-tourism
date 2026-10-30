import { InProgress } from '@/components/layout/InProgress'
import { PageHeader } from '@/components/layout/PageHeader'

/**
 * My Learning Record (29 Oct, SPEC §4): tabs for Training History, Certificates and CPD, and
 * External Certificates. Foundation stub: the learner-record lane replaces the body.
 */
export function LearnerRecordPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="My Learning Record"
        description="One record across your programmes: training history, certificates and CPD, and external certificates."
      />
      <InProgress />
    </div>
  )
}
