import { createFileRoute, notFound } from '@tanstack/react-router'
import { ProgrammeDetailPage } from '@/features/programmes/components/ProgrammeDetailPage'
import { programmeQuery } from '@/features/programmes/queries/programmes.queries'
import { programmeFromSlug } from '@/features/programmes/utils/slug'

/** Programme overview: /programmes/a, /programmes/b, /programmes/c (brief §3). */
export const Route = createFileRoute('/programmes/$code/')({
  loader: ({ params, context }) => {
    const code = programmeFromSlug(params.code)
    if (!code) throw notFound()
    void context.queryClient.prefetchQuery(programmeQuery(code))
    return { code }
  },
  component: function ProgrammeRoute() {
    const { code } = Route.useLoaderData()
    return <ProgrammeDetailPage code={code} />
  },
})
