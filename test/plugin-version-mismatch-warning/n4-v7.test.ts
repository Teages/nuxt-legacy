import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { collectStderr, findMismatchWarning, legacyConfigOverride, rootV4 } from '../utils/plugin-legacy-warning'

// consola writes warnings via `process.stderr.write`, so the spy must be set
// up before `setup()` registers its beforeAll hooks.
describe('nuxt 4 + plugin-legacy v7 (no warning)', async () => {
  const spyStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  afterAll(() => spyStderr.mockRestore())

  await setup({
    rootDir: rootV4,
    server: false,
    nuxtConfig: legacyConfigOverride('plugin-legacy-v7'),
  })

  it('does not emit a mismatch warning', () => {
    expect(findMismatchWarning(collectStderr(spyStderr))).toBeNull()
  })
})
