import type { Nuxt } from '@nuxt/schema'

/**
 * Returns the Nuxt major version (e.g. `4` for Nuxt 4.4.8), or `0` when it
 * cannot be determined.
 *
 * Reads the internal `nuxt._version` rather than `getNuxtVersion` from
 * `@nuxt/kit` to stay self-contained and avoid pulling extra context.
 */
export function getNuxtMajorVersion(nuxt: Nuxt): number {
  const match = String((nuxt as any)._version ?? '').match(/^\d+/)
  return match ? Number.parseInt(match[0]!, 10) : 0
}
