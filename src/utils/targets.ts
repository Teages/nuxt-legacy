import browserslist from 'browserslist'

// Minimum browser versions that support optional chaining (`?.`).
// Source: https://caniuse.com/mdn-javascript_operators_optional_chaining
// Any browser below these thresholds can't parse `?.` and will fail to load
// legacy chunks that plugin-legacy 8.1+ produces under oxc minification.
const OPTIONAL_CHAINING_MIN: Readonly<Record<string, string>> = {
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
// browser that does NOT support optional chaining (`?.`). Invalid queries
// (parse error, empty result, unknown browser names) return false — we only
// warn when we have positive evidence the user's targets include a browser
// that will break.
export function targetsIncludeBrowsersWithoutOptionalChaining(targets: unknown): boolean {
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
    const required = OPTIONAL_CHAINING_MIN[name]
    if (!required) {
      return false
    }
    const actual = match[3] ? `${match[2]}.${match[3]}` : match[2]!
    return versionBelow(actual, required)
  })
}
