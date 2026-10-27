import { env } from '@server/config/env'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// postgres.js connects lazily on the first query, so importing this file never opens a socket.
const client = postgres(env.DATABASE_URL, { max: 10, connect_timeout: 10 })

export const db = drizzle({ client, schema })

export type Db = typeof db

export async function closeDb() {
  await client.end({ timeout: 5 })
}
