// Version-aware dispatch for plugin-legacy snippets.
//
// `@vitejs/plugin-legacy` does not export the snippet scripts themselves (only
// `cspHashes`), so we vendor them per major. The selected set flows from
// build-time `setupVite` → `#nuxt-legacy/options.mjs` → the nitro server plugin,
// so the injected inline scripts always match the installed plugin-legacy major.

import * as v7 from './v7'
import * as v8 from './v8'

export { v7, v8 }

/** The snippet fields consumed by the server plugin and CSP hashing. */
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

/**
 * Returns the snippet set matching a `@vitejs/plugin-legacy` major version.
 * Unknown/future majors fall back to the latest vendored set (v8).
 */
export function selectSnippets(major: number): LegacySnippets {
  return major >= 8 ? v8 : v7
}
