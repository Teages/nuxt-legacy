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

  it('lists the plugin-legacy v7 CSP hashes', () => {
    const hashesInDoc = Array.from(readme.matchAll(HASH_REGEX), match => match[1])
    const v7Hashes = cspHashesFor(7)

    // The first 4 hashes in the README are the v7 set.
    expect(hashesInDoc.slice(0, 4)).toStrictEqual(v7Hashes)
  })

  it('lists the plugin-legacy v8 CSP hashes', () => {
    const hashesInDoc = Array.from(readme.matchAll(HASH_REGEX), match => match[1])
    const v8Hashes = cspHashesFor(8)

    // The next 4 hashes in the README are the v8 set.
    expect(hashesInDoc.slice(4, 8)).toStrictEqual(v8Hashes)
  })

  it('v7 hashes match the installed @vitejs/plugin-legacy', async () => {
    // The root workspace installs @vitejs/plugin-legacy v7.
    const { cspHashes: viteCspHashes } = await import('@vitejs/plugin-legacy')
    expect(viteCspHashes).toStrictEqual(cspHashesFor(7))
  })
})
