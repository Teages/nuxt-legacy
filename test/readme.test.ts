import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { cspHashesFor } from '../src/csp'

const HASH_REGEX = /`sha256-(.+)`/g

describe('verify README.md', () => {
  const readme = fs.readFileSync(
    path.resolve(__dirname, '../README.md'),
    'utf-8',
  )

  it('lists the plugin-legacy v8 CSP hashes', () => {
    const hashesInDoc = Array.from(readme.matchAll(HASH_REGEX), match => match[1])
    const v8Hashes = cspHashesFor(8)

    // The README lists a single hash set (plugin-legacy v8).
    expect(hashesInDoc).toStrictEqual(v8Hashes)
  })

  it('v8 hashes match the installed @vitejs/plugin-legacy', async () => {
    // The root workspace installs @vitejs/plugin-legacy v8.
    const { cspHashes: viteCspHashes } = await import('@vitejs/plugin-legacy')
    expect(viteCspHashes).toStrictEqual(cspHashesFor(8))
  })
})
