import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $fetch, setup, useTestContext } from '@nuxt/test-utils/e2e'
import { parse } from 'node-html-parser'
import { describe, expect, it } from 'vitest'
import { assertLegacyHtml, assertModernPolyfillsFirst } from './legacy-html'

interface PlaygroundTestOptions {
  name: string
  dir: string
  server?: boolean
  viteEnvironmentApi?: boolean
}

export function describePlayground(options: PlaygroundTestOptions) {
  const server = options.server ?? true

  describe(`playground: ${options.name}`, async () => {
    await setup({
      rootDir: fileURLToPath(new URL(`../../playgrounds/${options.dir}`, import.meta.url)),
      server,
    })

    if (!server) {
      it('builds legacy assets', async () => {
        const assets = await readLegacyAssets()

        expect(assets.some(asset => asset.content.includes('core-js'))).toBe(true)
        expect(assets.some(asset => asset.content.includes('System.register'))).toBe(true)
      })
      return
    }

    it('renders the index page with legacy chunks', async () => {
      const document = parse(await $fetch('/'))

      assertLegacyHtml(document)
    })

    it('serves modern polyfills as the first script', async () => {
      const document = parse(await $fetch('/'))

      await assertModernPolyfillsFirst(document, $fetch)
    })

    if (options.viteEnvironmentApi) {
      it('keeps legacy assets available with the Vite environment API enabled', async () => {
        const document = parse(await $fetch('/'))
        const { legacyEntrySrc, legacyPolyfillSrc } = assertLegacyHtml(document)

        await expect($fetch(legacyPolyfillSrc!)).resolves.toContain('core-js')
        await expect($fetch(legacyEntrySrc!)).resolves.toContain('System.register')
      })
    }
  })
}

async function readLegacyAssets() {
  const ctx = useTestContext()
  const outputDir = ctx.nuxt?.options.nitro.output?.dir
  if (!outputDir) {
    throw new Error('Nuxt output directory is not available')
  }

  const publicDir = join(outputDir, 'public')
  const files = await listFiles(publicDir)
  const legacyAssets = files.filter(file => file.endsWith('-legacy.js'))
  expect(legacyAssets.length).toBeGreaterThan(0)

  return Promise.all(
    legacyAssets.map(async file => ({
      file,
      content: await fs.readFile(file, 'utf8'),
    })),
  )
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const resolved = join(dir, entry.name)
      return entry.isDirectory() ? listFiles(resolved) : [resolved]
    }),
  )
  return nested.flat()
}
