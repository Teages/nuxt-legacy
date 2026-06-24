import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { collectStderr, findMismatchWarning, legacyConfigOverride, rootV5 } from '../utils/plugin-legacy-warning'

// consola writes warnings via `process.stderr.write`, so the spy must be set
// up before `setup()` registers its beforeAll hooks.
describe('nuxt 5 + plugin-legacy v7 (too old)', async () => {
  const spyStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  afterAll(() => spyStderr.mockRestore())

  await setup({
    rootDir: rootV5,
    server: false,
    nuxtConfig: legacyConfigOverride('plugin-legacy-v7'),
  })

  it('warns the plugin-legacy major is too old', async () => {
    const match = findMismatchWarning(collectStderr(spyStderr))
    expect(match).not.toBeNull()
    expect(match![1]).toBe('old')
    expect(match![2]).toBe('8')
  })
})
