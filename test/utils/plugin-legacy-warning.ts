import type { MockInstance } from 'vitest'
import { fileURLToPath } from 'node:url'

// @nuxt/test-utils shares one process-wide context, so each matrix combo
// needs its own file with a top-level setup().

export const rootV4 = fileURLToPath(new URL('../../playgrounds/v4', import.meta.url))
export const rootV5 = fileURLToPath(new URL('../../playgrounds/v5', import.meta.url))

export const MISMATCH_RE = /Detected @vitejs\/plugin-legacy@\d+\.\d+\.\d+, which is too (new|old) for Vite (\d+)/

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001B\[[0-9;]*m/g

export function collectStderr(spy: MockInstance<(chunk: any) => boolean>): string {
  return spy.mock.calls.map(c => c[0]?.toString() ?? '').join('')
}

export function findMismatchWarning(stderr: string): RegExpMatchArray | null {
  return stderr.replace(ANSI_RE, '').match(MISMATCH_RE)
}

// `legacy` is re-declared wholesale: Nuxt's top-level override doesn't deep-merge.
export function legacyConfigOverride(packageName: string) {
  return {
    legacy: {
      vite: { targets: ['fully supports proxy'], modernPolyfills: true },
      viteLegacyPackageName: packageName,
    },
  }
}
