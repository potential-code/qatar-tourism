import { ROLEPLAY_RUBRIC } from '@shared/constants'
import { ROLEPLAY_SCENARIOS } from '@shared/content'
import { SimulatedTag } from '@/components/layout'

const SCENARIO = ROLEPLAY_SCENARIOS[0]

/** Example scores from the brief §9 worked example (16 of 20, shown as 80 of 100). */
const EXAMPLE_SCORES = [4, 3, 3, 3, 3]

/** Practise with AI: the changed-booking scenario and the five-criterion rubric (brief §9). */
export function AiPracticePreview() {
  if (!SCENARIO) return null
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <SimulatedTag label="Simulated AI practice" />
        <span className="text-muted-foreground text-sm">
          {SCENARIO.title}, {SCENARIO.difficulty}, about {SCENARIO.estimatedMinutes} minutes, text
          or voice
        </span>
      </div>
      <ol className="grid gap-3" aria-label="Sample conversation">
        <li className="max-w-[85%] rounded-xl rounded-ss-sm bg-white p-4 text-sm ring-1 ring-ink/5">
          <span className="mb-1 block font-medium text-maroon text-xs">Visitor</span>
          {SCENARIO.visitorOpening}
        </li>
        <li className="ms-auto max-w-[85%] rounded-xl rounded-se-sm bg-teal p-4 text-sm text-white">
          <span className="mb-1 block font-medium text-white/80 text-xs">You</span>I am sorry your
          plans have changed. May I ask how much time you have today, so I can check two options
          that will work?
        </li>
        <li className="max-w-[85%] rounded-xl rounded-ss-sm bg-white p-4 text-sm ring-1 ring-ink/5">
          <span className="mb-1 block font-medium text-maroon text-xs">Visitor</span>
          {SCENARIO.visitorFollowUps[0]}
        </li>
      </ol>
      <div className="grid gap-3 rounded-xl bg-white p-5 ring-1 ring-ink/5">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Example feedback</p>
          <p className="font-display text-2xl text-teal">80 / 100</p>
        </div>
        <ul className="grid gap-1.5 text-sm">
          {ROLEPLAY_RUBRIC.map((criterion, i) => (
            <li key={criterion.key} className="flex justify-between gap-4">
              <span>{criterion.label}</span>
              <span className="text-muted-foreground">{EXAMPLE_SCORES[i]} of 4</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-sm">
          Strength: you acknowledged the visitor’s frustration. Improve: verify availability before
          promising an alternative.
        </p>
      </div>
    </div>
  )
}
