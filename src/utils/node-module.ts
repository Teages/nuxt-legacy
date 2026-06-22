// Adapted from mlly by Pooya Parsa (https://github.com/unjs/mlly)
// MIT License — Copyright (c) Pooya Parsa <pooya@pi0.io>
// See https://github.com/unjs/mlly/blob/main/LICENSE

import { normalize } from 'node:path'
import { fileURLToPath as nodeFileURLToPath } from 'node:url'

/** Normalizes a path or `file://` URL to a filesystem path (mlly-compatible). */
function toFilePath(id: string): string {
  if (!id.startsWith('file://')) {
    return normalize(id)
  }
  return normalize(nodeFileURLToPath(id))
}

// Adapted verbatim from mlly; the lazy `.*?` + optional quantifiers here are
// safe because the expression is anchored (`^...$`) and the preceding segments
// are bounded. Suppressed to keep the vendored routine byte-identical to upstream.
// eslint-disable-next-line regexp/no-super-linear-backtracking, regexp/no-useless-quantifier, regexp/no-useless-lazy
export const NODE_MODULES_RE = /^(.+\/node_modules\/)([^/@]+|@[^/]+\/[^/]+)(\/?.*?)?$/

/**
 * Parses a node module path to extract the directory, name, and subpath.
 *
 * @param path - The path to parse (file URL or filesystem path).
 * @returns An object containing the directory, module name, and subpath of the node module.
 */
export function parseNodeModulePath(path: string): {
  dir?: string
  name?: string
  subpath?: string
} {
  if (!path) {
    return {}
  }
  path = toFilePath(path)
  const match = NODE_MODULES_RE.exec(path)
  if (!match) {
    return {}
  }
  const [, dir, name, subpath] = match
  return {
    dir,
    name,
    subpath: subpath ? `.${subpath}` : undefined,
  }
}
