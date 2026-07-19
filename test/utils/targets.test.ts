import { describe, expect, it } from 'vitest'
import { targetsIncludeBrowsersWithoutOptionalChaining } from '../../src/utils/targets'

describe('targetsIncludeBrowsersWithoutOptionalChaining', () => {
  it('returns false for empty / unset targets', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining(undefined)).toBe(false)
    expect(targetsIncludeBrowsersWithoutOptionalChaining(null)).toBe(false)
    expect(targetsIncludeBrowsersWithoutOptionalChaining('')).toBe(false)
    expect(targetsIncludeBrowsersWithoutOptionalChaining([])).toBe(false)
    expect(targetsIncludeBrowsersWithoutOptionalChaining(false)).toBe(false)
  })

  it('returns false for an invalid browserslist query (does not throw)', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining(['not-a-real-browser 99'])).toBe(false)
    expect(targetsIncludeBrowsersWithoutOptionalChaining([' incomplete string'])).toBe(false)
  })

  it('returns true when targets include Chrome 49 (fully supports proxy)', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining(['fully supports proxy'])).toBe(true)
  })

  it('returns true when targets include Chrome 61 (fully supports es6-module)', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining(['fully supports es6-module'])).toBe(true)
  })

  it('returns true when targets include Chrome 79 (just below optional chaining support)', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining(['Chrome <= 79'])).toBe(true)
  })

  it('returns false when targets only include browsers with optional chaining support', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining(['Chrome 80'])).toBe(false)
    expect(targetsIncludeBrowsersWithoutOptionalChaining(['fully supports mdn-javascript_operators_optional_chaining'])).toBe(false)
  })

  it('returns false for modern-only queries like "last 2 versions"', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining(['last 2 versions'])).toBe(false)
  })

  it('accepts a string query, not just an array', () => {
    expect(targetsIncludeBrowsersWithoutOptionalChaining('fully supports proxy')).toBe(true)
  })

  it('returns true when comma-separated string includes old browsers', () => {
    // browserslist treats array items as AND (intersection) and comma-separated
    // strings as OR (union) — the latter is how users typically combine queries.
    expect(targetsIncludeBrowsersWithoutOptionalChaining(
      'fully supports proxy, last 2 versions',
    )).toBe(true)
  })
})
