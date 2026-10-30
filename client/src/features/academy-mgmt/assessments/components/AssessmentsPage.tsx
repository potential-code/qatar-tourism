import { useState } from 'react'
import { DemoSettingsNote } from '@/components/layout'
import { Reveal } from '@/components/motion/Reveal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ManagePage } from '../../hub/components/ManagePage'
import { Panel } from '../../hub/components/Panel'
import { AssessmentBuilder } from './AssessmentBuilder'
import { AttemptsTab } from './AttemptsTab'
import { QuestionBank } from './QuestionBank'
import { Rubrics } from './Rubrics'

const TABS = [
  { value: 'banks', label: 'Question Banks' },
  { value: 'builder', label: 'Assessment Builder' },
  { value: 'attempts', label: 'Attempts' },
  { value: 'rubrics', label: 'Rubrics and thresholds' },
] as const

/**
 * Academy Management, Assessments (SPEC §6): bilingual question banks, the rule builder for the
 * pre and post assessments, and every attempt with its snapshot. Assignments and role-play stay
 * separately scored activities with their own rubrics.
 */
export function AssessmentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('banks')
  return (
    <ManagePage
      title="Assessments"
      description="Question banks with English and Arabic variants, configurable rules for the pre and post assessments, and every learner attempt."
      actions={<DemoSettingsNote />}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-5">
        <TabsList className="h-auto flex-wrap" aria-label="Assessment management">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="banks">
          <Reveal>
            <Panel
              title="Question banks"
              description="Each question has a linked English and Arabic variant. Editing a published question creates the next version; attempts already taken keep the version they drew."
            >
              <QuestionBank />
            </Panel>
          </Reveal>
        </TabsContent>
        <TabsContent value="builder">
          <AssessmentBuilder />
        </TabsContent>
        <TabsContent value="attempts">
          <AttemptsTab />
        </TabsContent>
        <TabsContent value="rubrics">
          <section className="grid gap-4">
            <h2 className="font-display text-2xl font-normal text-ink">Rubrics and thresholds</h2>
            <Rubrics />
          </section>
        </TabsContent>
      </Tabs>
    </ManagePage>
  )
}
