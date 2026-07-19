import browserslist from 'browserslist'

// Minimum browser versions that oxc's minifier effectively supports. Empirically
// derived from caniuse-lite's optional-chaining data: plugin-legacy 8.1+ on
// Vite 8 runs oxc on legacy chunks, which can re-introduce ES2020-era syntax
// (`?.`, `??`, ...) that babel/preset-env had transpiled. Chrome 80 / Firefox
// 74 / Safari 13.1 is the observed threshold below which the output breaks.
const OXC_BASELINE: Readonly<Record<string, string>> = {
  and_chr: '80',
  and_ff: '79',
  chrome: '80',
  edge: '80',
  firefox: '74',
  ie: '12',
  ie_mob: '12',
  ios_saf: '13.4',
  op_mob: '64',
  opera: '67',
  safari: '13.1',
  samsung: '13',
}

function versionBelow(actual: string, required: string): boolean {
  const [aMajor = 0, aMinor = 0] = actual.split('.').map(n => Number.parseInt(n, 10) || 0)
  const [rMajor = 0, rMinor = 0] = required.split('.').map(n => Number.parseInt(n, 10) || 0)
  return aMajor < rMajor || (aMajor === rMajor && aMinor < rMinor)
}

// Returns true if the explicit query, or the Browserslist config below rootDir,
// resolves to at least one browser below oxc's effective baseline. Invalid
// queries (parse error, empty result, unknown browser names) return false — we
// only warn when we have positive evidence a target browser will break.
export function targetsBelowOxcBaseline(targets: unknown, rootDir?: string): boolean {
  let list: string[]
  try {
    const configuredTargets = targets || (rootDir ? browserslist.loadConfig({ path: rootDir }) : undefined)
    if (!configuredTargets) {
      return false
    }
    list = browserslist(configuredTargets as Parameters<typeof browserslist>[0])
  }
  catch {
    return false
  }
  return list.some((entry) => {
    // browserslist entries look like "chrome 49", "safari 13.1", "and_chr 80"
    const match = entry.match(/^([a-z_]+)\s+(\d+(?:\.\d+)?)(?:-\d+(?:\.\d+)?)?$/i)
    if (!match) {
      return false
    }
    const name = match[1]!.toLowerCase()
    const required = OXC_BASELINE[name]
    if (!required) {
      return false
    }
    return versionBelow(match[2]!, required)
  })
}
