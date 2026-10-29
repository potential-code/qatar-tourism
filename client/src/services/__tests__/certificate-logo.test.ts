import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { QATAR_TOURISM_LOGO_SVG } from '../certificates/logo'

test('the embedded certificate logo matches the public brand file', async () => {
  const file = await Bun.file(
    join(import.meta.dir, '../../../public/brand/qatar-tourism-logo.svg'),
  ).text()
  expect(QATAR_TOURISM_LOGO_SVG).toBe(file)
  expect(QATAR_TOURISM_LOGO_SVG).toMatch(/<path d="[^"]+"[^>]*style="fill:#[0-9a-fA-F]{6}"/)
})
