import { createFileRoute } from '@tanstack/react-router'
import { ProgrammesIndexPage } from '@/features/programmes/components/ProgrammesIndexPage'

export const Route = createFileRoute('/programmes/')({
  component: ProgrammesIndexPage,
})
