import type { catalogueQuery, mySessionsQuery } from './queries/sessions.queries'

type Data<T extends () => { queryFn?: unknown }> = Awaited<
  ReturnType<Extract<ReturnType<T>['queryFn'], (...args: never[]) => unknown>>
>

export type CatalogueData = Data<typeof catalogueQuery>
export type CatalogueSession = CatalogueData['items'][number]
export type Eligibility = CatalogueSession['eligibility']
export type MySessionsData = Data<typeof mySessionsQuery>
export type MyBooking = MySessionsData['items'][number]
/** The session shape shared by learner and trainer screens. */
export type SessionInfo = MyBooking['session']
