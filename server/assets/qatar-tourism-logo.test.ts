import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { QATAR_TOURISM_LOGO_SVG } from './qatar-tourism-logo'

test('the embedded certificate logo matches the client brand file', async () => {
  const client = await Bun.file(
    join(import.meta.dir, '../../client/public/brand/qatar-tourism-logo.svg'),
  ).text()
  expect(QATAR_TOURISM_LOGO_SVG).toBe(client)
  expect(QATAR_TOURISM_LOGO_SVG).toMatch(/<path d="[^"]+"[^>]*style="fill:#[0-9a-fA-F]{6}"/)
})
