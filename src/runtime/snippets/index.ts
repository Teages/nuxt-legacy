// plugin-legacy only exports `cspHashes`, not the snippet scripts themselves,
// so we vendor them per major. Flow: setupVite → #nuxt-legacy/options.mjs →
// nitro server plugin; injected inline scripts must match the installed major.
//
// v7 support was dropped in @teages/nuxt-legacy v4.0.0 (Nuxt 4.5+ ships Vite 8,
// which requires plugin-legacy v8). Future majors fall back to v8 until a new
// set is vendored.

import * as v8 from './v8'

export { v8 }

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

// v8 is the only vendored set; the `major` argument is retained for forward
// compatibility with future plugin-legacy majors.
export function selectSnippets(_major: number): LegacySnippets {
  return v8
}
