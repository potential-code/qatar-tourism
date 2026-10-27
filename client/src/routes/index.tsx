import { createFileRoute, Link } from '@tanstack/react-router'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

/** Public homepage. Placeholder until the public-site feature (brief §2) replaces it. */
export const Route = createFileRoute('/')({
  component: HomePlaceholder,
})

function HomePlaceholder() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 p-6 text-center">
      <Logo withAcademy className="h-16" />
      <h1 className="font-display text-4xl font-light">
        Build the skills to create memorable visitor experiences.
      </h1>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={'/design' as never}>Design system</Link>
        </Button>
      </div>
    </main>
  )
}
