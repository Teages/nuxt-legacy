import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { collectStderr, findMismatchWarning, legacyConfigOverride, rootV5 } from '../utils/plugin-legacy-warning'

// @nuxt/test-utils keeps a single process-wide context, so each matrix
// combination lives in its own file — see nuxt-modules/google-fonts's
// test/warn.test.ts for the same one-setup-per-file pattern. consola's default
// reporter writes warnings via `process.stderr.write` (bypassing console.*),
// so the spy must be set up before `setup()` registers its beforeAll hooks.
describe('nuxt 5 + plugin-legacy v8 (no warning)', async () => {
  const spyStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  afterAll(() => spyStderr.mockRestore())

  await setup({
    rootDir: rootV5,
    server: false,
    nuxtConfig: legacyConfigOverride('plugin-legacy-v8'),
  })

  it('does not emit a mismatch warning', () => {
    expect(findMismatchWarning(collectStderr(spyStderr))).toBeNull()
  })
})
