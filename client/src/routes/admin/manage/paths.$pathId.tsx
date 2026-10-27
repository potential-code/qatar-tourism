import { createFileRoute } from '@tanstack/react-router'
import { PathBuilder } from '@/features/academy-mgmt/paths/components/PathBuilder'

export const Route = createFileRoute('/admin/manage/paths/$pathId')({
  component: PathBuilderPage,
})

function PathBuilderPage() {
  const { pathId } = Route.useParams()
  return <PathBuilder key={pathId} pathId={pathId} />
}
