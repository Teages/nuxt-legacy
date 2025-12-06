import type { PolyfillOption } from '../utils/define-polyfill'
import { addPluginTemplate, addTemplate } from '@nuxt/kit'
import browserlist from 'browserslist'
// Built-in polyfill implementations were removed. Keep the injection
// logic so polyfills can be added back as an opt-in feature later.

export interface CustomPolyfillsOptions {
  targets?: string | string[] | Record<string, string> | null
}

const availablePolyfills: PolyfillOption[] = []

export async function setupCustomPolyfills(options: CustomPolyfillsOptions) {
  const targets = resolveTargets(options.targets)

  // only inject polyfills for targets that need them
  const polyfills = sortPolyfillsByDependency(filterPolyfills(availablePolyfills, targets))
  if (polyfills.length === 0) {
    return
  }

  addTemplate({
    filename: 'nuxt-legacy/custom-polyfills.mjs',
    getContents: () => [
      `export function setup() {`,
      ...polyfills.map(p => `  (${p.setup.toString()})(window);`),
      `}`,
    ].join('\n'),
  })
  addPluginTemplate({
    filename: 'custom-polyfills-plugin.mjs',
    getContents: () => [
      `import { defineNuxtPlugin } from '#app/nuxt'`,
      `import { setup } from '#build/nuxt-legacy/custom-polyfills.mjs'`,
      'if (import.meta.client) setup();',
      `export default defineNuxtPlugin({`,
      `  name: 'custom-polyfills-plugin',`,
      `  setup (nuxtApp) {`,
      `  }`,
      `})`,
    ].join('\n'),
  })
}

/**
 * Filter polyfills based on target browsers
 */
function filterPolyfills(
  polyfills: PolyfillOption[],
  targets: string[] | null,
) {
  if (!targets) {
    // if no targets specified, include all polyfills
    return polyfills
  }

  // get target browsers
  const targetBrowsers = browserlist([...targets, 'not dead'])

  return polyfills.filter((polyfill) => {
    // if polyfill doesn't specify browserlist, always include it
    if (!polyfill.browserlist) {
      return true
    }

    try {
      // get browsers that DON'T need this polyfill
      const browsersWithoutPolyfill = new Set(browserlist(polyfill.browserlist))

      // check if any target browser needs the polyfill
      // (i.e., not in the browsersWithoutPolyfill list)
      const needsPolyfill = targetBrowsers.some((target) => {
        return !browsersWithoutPolyfill.has(target)
      })

      return needsPolyfill
    }
    catch {
      // if browserlist parsing fails, include the polyfill to be safe
      return true
    }
  })
}

/**
 * Sort polyfills by dependency order (dependencies first)
 */
function sortPolyfillsByDependency(polyfills: PolyfillOption[]) {
  const polyfillMap = new Map(polyfills.map(p => [p.name, p]))
  const sorted: PolyfillOption[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(polyfill: PolyfillOption) {
    if (visited.has(polyfill.name)) {
      return
    }

    if (visiting.has(polyfill.name)) {
      throw new Error(`Circular dependency detected: ${polyfill.name}`)
    }

    visiting.add(polyfill.name)

    // process dependencies first
    const dependencies = polyfill.relyOn
      ? Array.isArray(polyfill.relyOn)
        ? polyfill.relyOn
        : [polyfill.relyOn]
      : []

    for (const depName of dependencies) {
      const dep = polyfillMap.get(depName)
      if (dep) {
        visit(dep)
      }
    }

    visiting.delete(polyfill.name)
    visited.add(polyfill.name)
    sorted.push(polyfill)
  }

  for (const polyfill of polyfills) {
    visit(polyfill)
  }

  return sorted
}

function resolveTargets(input: CustomPolyfillsOptions['targets']) {
  if (typeof input === 'string') {
    return [input]
  }
  if (Array.isArray(input)) {
    return input
  }
  if (typeof input === 'object' && input !== null) {
    return Object.entries(input).map(([key, value]) => `${key} ${value}`)
  }
  return null
}
