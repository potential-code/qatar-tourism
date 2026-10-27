import { createFileRoute, notFound } from '@tanstack/react-router'
import { TrainerProfilePage } from '@/features/programmes/components/TrainerProfilePage'

/** Public trainer profile, e.g. /trainers/T03 (brief §2 "link to trainer profiles"). */
export const Route = createFileRoute('/trainers/$code')({
  loader: ({ params }) => {
    const code = params.code.toUpperCase()
    if (!/^T\d{2}$/.test(code)) throw notFound()
    return { code }
  },
  component: function TrainerRoute() {
    const { code } = Route.useLoaderData()
    return <TrainerProfilePage code={code} />
  },
})
