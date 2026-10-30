import { useState } from 'react'
import { DemoSettingsNote } from '@/components/layout/DemoSettingsNote'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManagePage } from '../../hub/components/ManagePage'
import { DemoClockControl } from './DemoClockControl'
import { ExternalReviewsTab } from './ExternalReviewsTab'
import { IssuedTab } from './IssuedTab'
import { RenewalTab } from './RenewalTab'
import { RulesTab } from './RulesTab'
import { TemplatesTab } from './TemplatesTab'

const TABS = [
  ['templates', 'Templates'],
  ['rules', 'Rules'],
  ['issued', 'Issued Credentials'],
  ['renewal', 'Renewal'],
  ['reviews', 'External Reviews'],
] as const

/**
 * Certificates and CPD (SPEC §7): templates, rules, issued credentials, renewal queue and
 * external reviews, with the presenter's demo clock. English; the learner side is bilingual.
 */
export function CertificatesAdminPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('issued')
  return (
    <ManagePage
      title="Certificates and CPD"
      description="Templates, rules, issued credentials, renewal and external reviews."
      actions={<DemoSettingsNote />}
    >
      <DemoClockControl />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-6">
        <TabsList className="h-auto w-full max-w-full flex-wrap justify-start sm:w-fit">
          {TABS.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="issued">
          <IssuedTab />
        </TabsContent>
        <TabsContent value="renewal">
          <RenewalTab />
        </TabsContent>
        <TabsContent value="reviews">
          <ExternalReviewsTab />
        </TabsContent>
      </Tabs>
    </ManagePage>
  )
}
