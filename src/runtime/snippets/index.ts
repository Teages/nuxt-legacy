// plugin-legacy only exports `cspHashes`, not the snippet scripts themselves,
// so we vendor them per major. Flow: setupVite → #nuxt-legacy/options.mjs →
// nitro server plugin; injected inline scripts must match the installed major.

import * as v7 from './v7'
import * as v8 from './v8'

export { v7, v8 }

export interface LegacySnippets {
  safari10NoModuleFix: string
  legacyPolyfillId: string
  legacyEntryId: string
  systemJSInlineCode: string
  detectModernBrowserDetector: string
  detectModernBrowserCode: string
  dynamicFallbackInlineCode: string
  modernChunkLegacyGuard: string
}

// Unknown/future majors fall back to the latest vendored set (v8).
export function selectSnippets(major: number): LegacySnippets {
  return major >= 8 ? v8 : v7
}
