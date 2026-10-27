import { useQuery } from '@tanstack/react-query'
import { DemoBadge, PageHeader, SimulatedTag } from '@/components/layout'
import { useConversation } from '../hooks/useConversation'
import { promptsQuery } from '../queries/ai.queries'
import { ConversationPanel } from './ConversationPanel'
import { ResultsCanvas } from './ResultsCanvas'

/** Brief §13: full-width conversational analytics workspace, read-only, labelled as a demo. */
export function AnalyticsWorkspace() {
  const prompts = useQuery(promptsQuery())
  const conversation = useConversation()
  const list = prompts.data?.prompts ?? []

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            AI Analytics
            <SimulatedTag label="Demo analytics assistant" className="font-sans text-xs" />
          </span>
        }
        description="Ask questions in plain English. Answers are computed read-only from the same governed metrics as the Dashboard, restricted to your authorised data."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'AI Analytics' }]}
        actions={<DemoBadge compact />}
      />
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-6">
        <ConversationPanel
          turns={conversation.turns}
          prompts={list}
          pending={conversation.pending}
          failedQuestion={conversation.failedQuestion ?? null}
          selectedId={conversation.selectedId}
          onSend={conversation.send}
          onSelect={conversation.select}
          onReset={conversation.reset}
        />
        <ResultsCanvas
          answer={conversation.selected}
          prompts={list}
          onAsk={conversation.send}
          pending={conversation.pending}
        />
      </div>
    </>
  )
}
