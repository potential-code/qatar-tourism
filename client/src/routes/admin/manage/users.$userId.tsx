import { createFileRoute } from '@tanstack/react-router'
import { UserDetailPage } from '@/features/academy-mgmt/users/components/UserDetailPage'

export const Route = createFileRoute('/admin/manage/users/$userId')({
  component: UserDetailRoute,
})

function UserDetailRoute() {
  const { userId } = Route.useParams()
  return <UserDetailPage userId={userId} />
}
