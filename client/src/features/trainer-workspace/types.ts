import type {
  formOptionsQuery,
  impactQuery,
  learnersQuery,
  overviewQuery,
  profileQuery,
  rosterQuery,
  sessionDetailQuery,
  trainerSessionsQuery,
} from './queries/trainer.queries'

// biome-ignore lint/suspicious/noExplicitAny: matches any query-options factory
type Data<T extends (...args: any[]) => { queryFn?: unknown }> = Awaited<
  ReturnType<Extract<ReturnType<T>['queryFn'], (...args: never[]) => unknown>>
>

export type OverviewData = Data<typeof overviewQuery>
export type TrainerSessionsData = Data<typeof trainerSessionsQuery>
export type TrainerSession = TrainerSessionsData['items'][number]
export type SessionDetailData = Data<typeof sessionDetailQuery>
export type ImpactData = Data<typeof impactQuery>
export type FormOptions = Data<typeof formOptionsQuery>
export type RosterData = Data<typeof rosterQuery>
export type RosterRow = RosterData['items'][number]
export type LearnersData = Data<typeof learnersQuery>
export type TrainerProfile = Data<typeof profileQuery>
