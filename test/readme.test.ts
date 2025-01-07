import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { cspHashes } from '../src/module'

describe('verify README.md', () => {
  it('hashes of CSP in README.md should be correct', () => {
    const readme = fs.readFileSync(
      path.resolve(__dirname, '../README.md'),
      'utf-8',
    )
    const hashesInDoc = [...readme.matchAll(/`sha256-(.+)`/g)].map(
      match => match[1],
    )

    expect(hashesInDoc).toStrictEqual(cspHashes)
  })

  it('hashes of CSP in README.md should be same to `@vitejs/plugin-legacy`', async () => {
    const { cspHashes: viteCspHashes } = await import('@vitejs/plugin-legacy')
    expect(viteCspHashes).toStrictEqual(cspHashes)
  })
})
