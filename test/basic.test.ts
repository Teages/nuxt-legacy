import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { parse } from 'node-html-parser'
import { describe, expect, it } from 'vitest'

describe('basic', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    const document = parse(await $fetch('/'))

    expect(document.querySelector('#basic-content')?.textContent).toBe('basic')
  })
})
