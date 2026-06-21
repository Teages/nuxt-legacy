import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { parse } from 'node-html-parser'
import { describe, it } from 'vitest'
import { assertLegacyHtml, assertModernPolyfillsFirst } from './utils/legacy-html'

describe('max-compatibility', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/max-compatibility', import.meta.url)),
  })

  it('renders the index page with legacy chunks', async () => {
    const document = parse(await $fetch('/'))

    assertLegacyHtml(document)
  })

  it('modern polyfills should be the first script', async () => {
    const document = parse(await $fetch('/'))

    await assertModernPolyfillsFirst(document, $fetch)
  })
})
