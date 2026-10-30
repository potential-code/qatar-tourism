import { Waypoints } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CRM_COPY } from '@/services/crm/common'
import { ConnectionPane } from './ConnectionPane'
import { EventFlowPane } from './EventFlowPane'
import { MappingPane } from './MappingPane'
import { ScenarioPanel } from './ScenarioPanel'
import { SyncLogPane } from './SyncLogPane'

/** CRM Integration: the prominent two-way copy, Run scenario and the four sub-tabs. */
export function CrmTab() {
  const [scenario, setScenario] = useState(false)
  return (
    <div className="grid gap-6">
      <aside
        aria-label="Two-way integration"
        className="flex items-start gap-4 rounded-xl border border-teal/30 bg-gradient-to-br from-teal-mist to-white p-5"
      >
        <Waypoints aria-hidden className="mt-0.5 size-6 shrink-0 text-teal" />
        <p className="text-base leading-relaxed text-ink">{CRM_COPY.banner}</p>
        <Button
          className="ms-auto shrink-0"
          variant={scenario ? 'secondary' : 'default'}
          aria-expanded={scenario}
          onClick={() => setScenario((v) => !v)}
        >
          {scenario ? 'Hide scenario' : 'Run scenario'}
        </Button>
      </aside>
      {scenario ? <ScenarioPanel /> : null}
      <Tabs defaultValue="connection" className="gap-5">
        <TabsList aria-label="CRM Integration sections" className="h-auto flex-wrap justify-start">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
          <TabsTrigger value="flow">Event Flow</TabsTrigger>
          <TabsTrigger value="log">Sync Log</TabsTrigger>
        </TabsList>
        <TabsContent value="connection">
          <ConnectionPane />
        </TabsContent>
        <TabsContent value="mapping">
          <MappingPane />
        </TabsContent>
        <TabsContent value="flow">
          <EventFlowPane />
        </TabsContent>
        <TabsContent value="log">
          <SyncLogPane />
        </TabsContent>
      </Tabs>
    </div>
  )
}
