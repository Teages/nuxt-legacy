import type { Nuxt } from '@nuxt/schema'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolvePath } from '@nuxt/kit'

// Resolve from the consumer's vite-builder so we don't pick up this module's own Vite.
export async function getViteMajor(nuxt: Nuxt): Promise<number> {
  if (nuxt.options.builder !== '@nuxt/vite-builder') {
    return 0
  }

  try {
    const builderEntry = await resolvePath('@nuxt/vite-builder', {
      cwd: nuxt.options.rootDir,
    })

    const require = createRequire(builderEntry)
    const packagePath = require.resolve('vite/package.json')
    const pkg = JSON.parse(await readFile(packagePath, 'utf8')) as { version?: string }

    const major = Number.parseInt(String(pkg.version ?? '').match(/^\d+/)?.[0] ?? '', 10)
    return Number.isInteger(major) ? major : 0
  }
  catch {
    return 0
  }
}
