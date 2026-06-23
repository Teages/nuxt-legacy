import type { MockInstance } from 'vitest'
import { fileURLToPath } from 'node:url'

// The matrix combinations build a real Nuxt app per file — @nuxt/test-utils
// keeps a single process-wide context, so each combination lives in its own
// test file with a top-level `setup()`. This helper centralizes the shared
// pieces (paths, the warning regex, ANSI stripping, the legacy config base)
// so the four files stay tiny and consistent.

/** Absolute paths to the playgrounds reused as build roots. */
export const rootV4 = fileURLToPath(new URL('../../playgrounds/v4', import.meta.url))
export const rootV5 = fileURLToPath(new URL('../../playgrounds/v5', import.meta.url))

/**
 * Matches the "too new" / "too old" wording from `warnOnPluginLegacyMismatch`
 * in src/setup/vite.ts. Captures the direction (`new` | `old`) and the Nuxt
 * major.
 */
export const MISMATCH_RE = /Detected @vitejs\/plugin-legacy@\d+\.\d+\.\d+, which is too (new|old) for Nuxt (\d)/

/** Strip ANSI escape codes so the regex matches raw stderr chunks. */
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001B\[[0-9;]*m/g

/** Collects & decodes a `process.stderr.write` spy's calls into one string. */
export function collectStderr(spy: MockInstance<(chunk: any) => boolean>): string {
  return spy.mock.calls.map(c => c[0]?.toString() ?? '').join('')
}

/** Returns the mismatch warning match from stderr output, or null if absent. */
export function findMismatchWarning(stderr: string): RegExpMatchArray | null {
  return stderr.replace(ANSI_RE, '').match(MISMATCH_RE)
}

/**
 * Builds the `nuxtConfig` override for a matrix combination. Passed via the
 * documented `nuxtConfig` key of `@nuxt/test-utils`'s `setup()` — the module's
 * `legacy` configKey is supplied wholesale here (with `vite` re-declared)
 * because the top-level override does not deep-merge into the playground's
 * existing `legacy` block.
 */
export function legacyConfigOverride(packageName: string) {
  return {
    legacy: {
      vite: { targets: ['fully supports proxy'], modernPolyfills: true },
      viteLegacyPackageName: packageName,
    },
  }
}
