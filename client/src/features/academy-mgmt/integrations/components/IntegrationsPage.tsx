import { ManagePage } from '../../hub/components/ManagePage'
import { IntegrationsTabs } from './IntegrationsTabs'

/** Admin, Academy Management, Integrations and Security (SPEC §2 and §8). */
export function IntegrationsPage() {
  return (
    <ManagePage
      title="Integrations and Security"
      description="Single sign-on, API access, content hosting, data residency and the two-way CRM integration, as an illustrative configuration for review."
    >
      <IntegrationsTabs />
    </ManagePage>
  )
}
