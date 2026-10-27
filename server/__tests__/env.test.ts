import './helpers/env'

import { describe, expect, test } from 'bun:test'
import { parseEnv } from '@server/config/env'

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/app',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:8000',
  CLIENT_URL: 'http://localhost:5173',
}

function failingKeys(source: Record<string, string>) {
  const result = parseEnv(source)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('env schema', () => {
  test('accepts the minimum and applies defaults', () => {
    const result = parseEnv(valid)
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      NODE_ENV: 'development',
      PORT: 8000,
      LOG_LEVEL: 'info',
      TRUST_PROXY: false,
      MAILPIT_HOST: 'localhost',
      MAILPIT_PORT: 1025,
      CLIENT_URL: ['http://localhost:5173'],
    })
  })

  test("treats '' as unset: required keys fail", () => {
    expect(failingKeys({ ...valid, BETTER_AUTH_SECRET: '', DATABASE_URL: '' })).toEqual([
      'DATABASE_URL',
      'BETTER_AUTH_SECRET',
    ])
  })

  test("treats '' as unset: optional keys take their default", () => {
    const result = parseEnv({ ...valid, PORT: '', NODE_ENV: '', TRUST_PROXY: '' })
    expect(result.data?.PORT).toBe(8000)
    expect(result.data?.NODE_ENV).toBe('development')
    expect(result.data?.TRUST_PROXY).toBe(false)
  })

  test('coerces numbers and booleans', () => {
    const result = parseEnv({ ...valid, PORT: '3001', TRUST_PROXY: 'true' })
    expect(result.data?.PORT).toBe(3001)
    expect(result.data?.TRUST_PROXY).toBe(true)
  })

  test('rejects a short secret', () => {
    expect(failingKeys({ ...valid, BETTER_AUTH_SECRET: 'short' })).toEqual(['BETTER_AUTH_SECRET'])
  })

  test('splits CLIENT_URL into origins', () => {
    const result = parseEnv({
      ...valid,
      CLIENT_URL: 'http://localhost:5173, https://app.example.com/',
    })
    expect(result.data?.CLIENT_URL).toEqual(['http://localhost:5173', 'https://app.example.com'])
  })

  test('requires both AWS keys or neither', () => {
    expect(failingKeys({ ...valid, AWS_ACCESS_KEY_ID: 'AKIA' })).toEqual(['AWS_SECRET_ACCESS_KEY'])
  })
})
