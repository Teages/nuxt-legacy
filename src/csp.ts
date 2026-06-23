import type { LegacySnippets } from './runtime/snippets/index'
import crypto from 'node:crypto'
import { selectSnippets } from './runtime/snippets/index'

const hash = crypto.hash ?? ((
  algorithm: string,
  data: crypto.BinaryLike,
  outputEncoding: crypto.BinaryToTextEncoding,
) => crypto.createHash(algorithm).update(data).digest(outputEncoding))

/** Computes the four CSP `sha256-` hashes (base64) for a given snippet set. */
export function computeCspHashes(snippets: LegacySnippets): string[] {
  return [
    snippets.safari10NoModuleFix,
    snippets.systemJSInlineCode,
    snippets.detectModernBrowserCode,
    snippets.dynamicFallbackInlineCode,
  ].map(i => hash('sha256', i, 'base64'))
}

/**
 * CSP hashes for the `@vitejs/plugin-legacy` major installed in the consuming
 * project. Defaults to v7 (Nuxt 3/4) when the major is unknown.
 */
export function cspHashesFor(major: number): string[] {
  return computeCspHashes(selectSnippets(major))
}

/**
 * CSP hashes for plugin-legacy v7 (the Nuxt 3/4 default). Kept for backwards
 * compatibility with existing importers; prefer `cspHashesFor(major)`.
 */
export const cspHashes = cspHashesFor(7)
