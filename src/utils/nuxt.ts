import type { Nuxt } from '@nuxt/schema'

export function getNuxtMajorVersion(nuxt: Nuxt): number {
  const match = String(nuxt._version ?? '').match(/^\d+/)
  return match ? Number.parseInt(match[0]!, 10) : 0
}
