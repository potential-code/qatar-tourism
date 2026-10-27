import { REPORT_KEYS, type ReportKey } from '@shared/schemas/admin-reports'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { ReportView } from '@/features/reports/components/ReportView'
import { reportSearchSchema } from '@/features/reports/utils/search'

export const Route = createFileRoute('/admin/reports/$report')({
  validateSearch: reportSearchSchema,
  beforeLoad: ({ params }) => {
    if (!(REPORT_KEYS as readonly string[]).includes(params.report)) throw notFound()
  },
  component: function ReportRoute() {
    const { report } = Route.useParams()
    return <ReportView key={report} report={report as ReportKey} />
  },
})
