import { useState } from 'react'
import { IllustrativeNote } from '@/components/layout/IllustrativeNote'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiTab } from './ApiTab'
import { ContentHostingTab } from './ContentHostingTab'
import { CrmTab } from './crm/CrmTab'
import { DataResidencyTab } from './DataResidencyTab'
import { OverviewTab } from './OverviewTab'
import { SsoTab } from './SsoTab'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'sso', label: 'SSO' },
  { value: 'api', label: 'API Access' },
  { value: 'hosting', label: 'Content Hosting' },
  { value: 'residency', label: 'Data Residency' },
  { value: 'crm', label: 'CRM Integration' },
] as const

/** The six tabs of Integrations and Security under the standard illustrative-configuration note. */
export function IntegrationsTabs({ initialTab = 'overview' }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab)
  return (
    <div className="grid gap-6">
      <IllustrativeNote />
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <div className="overflow-x-auto">
          <TabsList
            aria-label="Integrations and Security sections"
            className="h-auto flex-wrap justify-start"
          >
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview">
          <OverviewTab onOpenTab={setTab} />
        </TabsContent>
        <TabsContent value="sso">
          <SsoTab />
        </TabsContent>
        <TabsContent value="api">
          <ApiTab />
        </TabsContent>
        <TabsContent value="hosting">
          <ContentHostingTab />
        </TabsContent>
        <TabsContent value="residency">
          <DataResidencyTab />
        </TabsContent>
        <TabsContent value="crm">
          <CrmTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
