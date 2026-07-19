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
  ios: '13.4',
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

// Returns true if the given browserslist query resolves to at least one
// browser below oxc's effective baseline. Invalid queries (parse error,
// empty result, unknown browser names) return false — we only warn when we
// have positive evidence the user's targets include a browser that will break.
export function targetsBelowOxcBaseline(targets: unknown): boolean {
  if (!targets) {
    return false
  }
  let list: string[]
  try {
    list = browserslist(targets as Parameters<typeof browserslist>[0])
  }
  catch {
    return false
  }
  return list.some((entry) => {
    // browserslist entries look like "chrome 49", "safari 13.1", "and_chr 80"
    const match = entry.match(/^([a-z_]+)\s+(\d+)(?:\.(\d+))?$/i)
    if (!match) {
      return false
    }
    const name = match[1]!.toLowerCase()
    const required = OXC_BASELINE[name]
    if (!required) {
      return false
    }
    const actual = match[3] ? `${match[2]}.${match[3]}` : match[2]!
    return versionBelow(actual, required)
  })
}
