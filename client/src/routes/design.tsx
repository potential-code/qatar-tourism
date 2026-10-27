import { createFileRoute } from '@tanstack/react-router'
import { DesignShowcase } from '@/features/design-showcase/DesignShowcase'

/** Living reference for the Phase 0 design kits. Every feature must look like this page. */
export const Route = createFileRoute('/design')({
  component: DesignShowcase,
})
