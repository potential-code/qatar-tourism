import { ScormPlayer } from '@/features/scorm-player/components/ScormPlayer'
import { XapiPlayer } from '@/features/xapi-player/components/XapiPlayer'
import type { ProgrammeCode, Unit } from '../../types'
import { BranchingPreview } from './BranchingPreview'
import { FormativeQuestions } from './FormativeQuestions'
import { PreviewUnit } from './PreviewUnit'
import { ResourceUnit } from './ResourceUnit'
import { SessionUnit } from './SessionUnit'
import { Transcript } from './Transcript'
import { VideoPlayer } from './VideoPlayer'

/** The player body for one unit: video, interactive package, resource or session. */
export function UnitContent({
  unit,
  programme,
  completed,
}: {
  unit: Unit
  programme: ProgrammeCode
  completed: boolean
}) {
  const content = unit.content
  switch (content.kind) {
    case 'video':
      return (
        <>
          <VideoPlayer
            programme={programme}
            courseCode="C01"
            media={content.media}
            title={unit.title}
            watchedPercent={content.watchedPercent}
            positionSeconds={content.positionSeconds}
            completeAt={content.completeAtPercent}
            completed={completed}
          />
          <Transcript text={content.transcript} scenes={content.scenes} />
        </>
      )
    case 'video_questions':
      return (
        <>
          <VideoPlayer
            programme={programme}
            courseCode="C03"
            media={content.media}
            title={unit.title}
            watchedPercent={content.watchedPercent}
            positionSeconds={content.positionSeconds}
            completeAt={null}
            completed={completed}
          />
          <Transcript text={content.transcript} />
          <FormativeQuestions questions={content.questions} programme={programme} />
        </>
      )
    case 'branching':
      return <BranchingPreview content={content} programme={programme} />
    case 'scorm':
      return <ScormPlayer code={unit.code} programme={programme} title={unit.title} />
    case 'xapi':
      return <XapiPlayer code={unit.code} programme={programme} title={unit.title} />
    case 'resource':
      return <ResourceUnit content={content} programme={programme} completed={completed} />
    case 'session':
      return <SessionUnit programme={programme} />
    default:
      return <PreviewUnit content={content} programme={programme} completed={completed} />
  }
}
