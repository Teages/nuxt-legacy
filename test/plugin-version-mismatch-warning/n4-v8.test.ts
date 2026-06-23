import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { collectStderr, findMismatchWarning, legacyConfigOverride, rootV4 } from '../utils/plugin-legacy-warning'

// @nuxt/test-utils keeps a single process-wide context, so each matrix
// combination lives in its own file — see nuxt-modules/google-fonts's
// test/warn.test.ts for the same one-setup-per-file pattern. consola's default
// reporter writes warnings via `process.stderr.write` (bypassing console.*),
// so the spy must be set up before `setup()` registers its beforeAll hooks.
describe('nuxt 4 + plugin-legacy v8 (too new)', async () => {
  const spyStderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  afterAll(() => spyStderr.mockRestore())

  await setup({
    rootDir: rootV4,
    server: false,
    nuxtConfig: legacyConfigOverride('plugin-legacy-v8'),
  })

  it('warns the plugin-legacy major is too new', () => {
    const match = findMismatchWarning(collectStderr(spyStderr))
    expect(match).not.toBeNull()
    expect(match![1]).toBe('new')
    expect(match![2]).toBe('4')
  })
})
