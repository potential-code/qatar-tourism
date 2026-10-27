import { createFileRoute, notFound } from '@tanstack/react-router'
import { EnrolConfirmPage } from '@/features/programmes/components/EnrolConfirmPage'
import { programmeFromSlug } from '@/features/programmes/utils/slug'

/** Join a programme: signed-out visitors are offered register or sign in, then return here. */
export const Route = createFileRoute('/programmes/$code/enrol')({
  loader: ({ params }) => {
    const code = programmeFromSlug(params.code)
    if (!code) throw notFound()
    return { code }
  },
  component: function EnrolRoute() {
    const { code } = Route.useLoaderData()
    return <EnrolConfirmPage code={code} />
  },
})
