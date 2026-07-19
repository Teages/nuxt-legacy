import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { cspHashes } from '../src/csp'

const HASH_REGEX = /`sha256-(.+)`/g

describe('verify README.md', () => {
  const readme = fs.readFileSync(
    path.resolve(__dirname, '../README.md'),
    'utf-8',
  )

  it('lists the plugin-legacy v8 CSP hashes', () => {
    const hashesInDoc = Array.from(readme.matchAll(HASH_REGEX), match => match[1])
    expect(hashesInDoc).toStrictEqual(cspHashes)
  })

  it('cspHashes match the installed @vitejs/plugin-legacy', async () => {
    const { cspHashes: viteCspHashes } = await import('@vitejs/plugin-legacy')
    expect(viteCspHashes).toStrictEqual(cspHashes)
  })
})
