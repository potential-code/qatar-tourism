import { adminUserListQuery } from '@shared/schemas/admin-users'
import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/features/academy-mgmt/users/components/UsersPage'

const search = adminUserListQuery.partial()

export const Route = createFileRoute('/admin/manage/users/')({
  validateSearch: (raw) => {
    const parsed = search.safeParse(raw)
    return parsed.success ? parsed.data : {}
  },
  component: UsersRoute,
})

function UsersRoute() {
  const searchState = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <UsersPage
      search={searchState}
      onSearch={(next) => navigate({ search: next, replace: true })}
    />
  )
}
