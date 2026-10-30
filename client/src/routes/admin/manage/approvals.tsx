import { APPROVAL_STATUSES, APPROVAL_TYPES } from '@shared/constants'
import { createFileRoute } from '@tanstack/react-router'
import {
  ApprovalsPage,
  type ApprovalsSearch,
} from '@/features/academy-mgmt/approvals/components/ApprovalsPage'

const oneOf = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  allowed.find((item) => item === value)

export const Route = createFileRoute('/admin/manage/approvals')({
  // `?status=pending` is the list the dashboard's Pending approvals count opens.
  validateSearch: (raw): ApprovalsSearch => ({
    status: oneOf(APPROVAL_STATUSES, raw.status),
    type: oneOf(APPROVAL_TYPES, raw.type),
  }),
  component: ApprovalsRoute,
})

function ApprovalsRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <ApprovalsPage search={search} onSearch={(next) => navigate({ search: next, replace: true })} />
  )
}
