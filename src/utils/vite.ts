import type { Nuxt } from '@nuxt/schema'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolvePath } from '@nuxt/kit'

/**
 * Resolves the Vite major bundled with the consumer's Nuxt Vite builder, by
 * resolving `@nuxt/vite-builder` from the project root and reading the `vite`
 * package.json it actually depends on.
 *
 * This is more reliable than `import { version } from 'vite'`, which could
 * resolve to this module's own Vite (or fail under strict pnpm layouts). The
 * builder-relative lookup guarantees we read the same Vite that builds the app.
 *
 * Returns `0` when the builder is not `@nuxt/vite-builder` or the major cannot
 * be determined (matching `detectPluginLegacyVersion`'s sentinel).
 */
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
