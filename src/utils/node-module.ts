// Adapted from mlly (https://github.com/unjs/mlly), MIT — Copyright (c) Pooya Parsa.

import { normalize } from 'node:path'
import { fileURLToPath as nodeFileURLToPath } from 'node:url'

function normalizeSlash(path: string): string {
  return path.replace(/\\/g, '/')
}

function toFilePath(id: string): string {
  if (!id.startsWith('file://')) {
    return normalizeSlash(normalize(id))
  }
  return normalizeSlash(nodeFileURLToPath(id))
}

// Vendored verbatim from mlly; anchored + bounded, suppress to stay byte-identical.
// eslint-disable-next-line regexp/no-super-linear-backtracking, regexp/no-useless-quantifier, regexp/no-useless-lazy
export const NODE_MODULES_RE = /^(.+\/node_modules\/)([^/@]+|@[^/]+\/[^/]+)(\/?.*?)?$/

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
