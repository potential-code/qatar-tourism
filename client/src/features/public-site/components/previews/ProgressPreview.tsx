import { COMPETENCIES } from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content'

/** Example pre and post scores per competency: the brief §8 worked example (40 to 80). */
const EXAMPLE = {
  discover_needs: [20, 20],
  verify_information: [0, 20],
  communicate_clearly: [20, 20],
  recover_service: [0, 20],
  protect_information: [0, 0],
} as const

/** Track your progress: baseline, post score and improvement, labelled as an example. */
export function ProgressPreview() {
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-3 gap-3 rounded-xl bg-white p-5 text-center ring-1 ring-ink/5">
        <div>
          <p className="text-muted-foreground text-xs">Baseline</p>
          <p className="font-display text-4xl text-ink/60">40</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Post-assessment</p>
          <p className="font-display text-4xl text-teal">80</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Improvement</p>
          <p className="font-display text-4xl text-teal-deep">+40</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <caption className="pb-2 text-start text-muted-foreground text-xs">
          Example result by competency, points out of 20
        </caption>
        <thead className="text-muted-foreground text-xs">
          <tr>
            <th scope="col" className="py-1 text-start font-normal">
              Competency
            </th>
            <th scope="col" className="py-1 text-end font-normal">
              Before
            </th>
            <th scope="col" className="py-1 text-end font-normal">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPETENCIES.map((key) => (
            <tr key={key} className="border-ink/5 border-t">
              <th scope="row" className="py-2 text-start font-normal">
                {COMPETENCY_LABELS[key]}
              </th>
              <td className="py-2 text-end text-muted-foreground">{EXAMPLE[key][0]}</td>
              <td className="py-2 text-end font-medium">{EXAMPLE[key][1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
