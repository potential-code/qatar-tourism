import { createFileRoute } from '@tanstack/react-router'
import { ContentLibraryPage } from '@/features/academy-mgmt/content/components/ContentLibraryPage'

export const Route = createFileRoute('/admin/manage/content')({
  component: ContentLibraryPage,
})
