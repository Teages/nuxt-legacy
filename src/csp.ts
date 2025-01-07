import crypto from 'node:crypto'
import { detectModernBrowserCode, dynamicFallbackInlineCode, safari10NoModuleFix, systemJSInlineCode } from './runtime/snippets'

const hash = crypto.hash ?? ((
  algorithm: string,
  data: crypto.BinaryLike,
  outputEncoding: crypto.BinaryToTextEncoding,
) => crypto.createHash(algorithm).update(data).digest(outputEncoding))

export const cspHashes = [
  safari10NoModuleFix,
  systemJSInlineCode,
  detectModernBrowserCode,
  dynamicFallbackInlineCode,
].map(i => hash('sha256', i, 'base64'))
