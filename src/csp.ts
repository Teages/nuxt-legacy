import type { LegacySnippets } from './runtime/snippets/index'
import crypto from 'node:crypto'
import { selectSnippets } from './runtime/snippets/index'

const hash = crypto.hash ?? ((
  algorithm: string,
  data: crypto.BinaryLike,
  outputEncoding: crypto.BinaryToTextEncoding,
) => crypto.createHash(algorithm).update(data).digest(outputEncoding))

// Four `sha256-` (base64) hashes for the inline scripts in a snippet set.
export function computeCspHashes(snippets: LegacySnippets): string[] {
  return [
    snippets.safari10NoModuleFix,
    snippets.systemJSInlineCode,
    snippets.detectModernBrowserCode,
    snippets.dynamicFallbackInlineCode,
  ].map(i => hash('sha256', i, 'base64'))
}

// CSP hashes for the installed plugin-legacy major; falls back to v7 or v8 via selectSnippets.
export function cspHashesFor(major: number): string[] {
  return computeCspHashes(selectSnippets(major))
}

// Backwards-compat alias; prefer `cspHashesFor(major)`.
export const cspHashes = cspHashesFor(7)
