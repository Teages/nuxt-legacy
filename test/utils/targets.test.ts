import { describe, expect, it } from 'vitest'
import { targetsBelowOxcBaseline } from '../../src/utils/targets'

describe('targetsBelowOxcBaseline', () => {
  it('returns false for empty / unset targets', () => {
    expect(targetsBelowOxcBaseline(undefined)).toBe(false)
    expect(targetsBelowOxcBaseline(null)).toBe(false)
    expect(targetsBelowOxcBaseline('')).toBe(false)
    expect(targetsBelowOxcBaseline([])).toBe(false)
    expect(targetsBelowOxcBaseline(false)).toBe(false)
  })

  it('returns false for an invalid browserslist query (does not throw)', () => {
    expect(targetsBelowOxcBaseline(['not-a-real-browser 99'])).toBe(false)
    expect(targetsBelowOxcBaseline([' incomplete string'])).toBe(false)
  })

  it('returns true when targets include Chrome 49 (fully supports proxy)', () => {
    expect(targetsBelowOxcBaseline(['fully supports proxy'])).toBe(true)
  })

  it('returns true when targets include Chrome 61 (fully supports es6-module)', () => {
    expect(targetsBelowOxcBaseline(['fully supports es6-module'])).toBe(true)
  })

  it('returns true when targets include Chrome 79 (just below oxc baseline)', () => {
    expect(targetsBelowOxcBaseline(['Chrome <= 79'])).toBe(true)
  })

  it('returns true for IE 11', () => {
    expect(targetsBelowOxcBaseline(['IE 11'])).toBe(true)
  })

  it('recognizes iOS Safari identifiers and version ranges', () => {
    expect(targetsBelowOxcBaseline(['iOS 12'])).toBe(true)
    expect(targetsBelowOxcBaseline(['iOS 13.3'])).toBe(true)
    expect(targetsBelowOxcBaseline(['iOS 13.4'])).toBe(false)
  })

  it('loads targets from a Browserslist config when inline targets are unset', () => {
    expect(targetsBelowOxcBaseline(undefined, import.meta.dirname)).toBe(true)
  })

  it('returns false when targets only include browsers at or above the baseline', () => {
    expect(targetsBelowOxcBaseline(['Chrome 80'])).toBe(false)
    expect(targetsBelowOxcBaseline(['fully supports mdn-javascript_operators_optional_chaining'])).toBe(false)
  })

  it('returns false for modern-only queries', () => {
    expect(targetsBelowOxcBaseline(['last 2 versions and not dead'])).toBe(false)
  })

  it('accepts a string query, not just an array', () => {
    expect(targetsBelowOxcBaseline('fully supports proxy')).toBe(true)
  })

  it('returns true when comma-separated string includes old browsers', () => {
    // browserslist treats array items as AND (intersection) and comma-separated
    // strings as OR (union) — the latter is how users typically combine queries.
    expect(targetsBelowOxcBaseline(
      'fully supports proxy, last 2 versions',
    )).toBe(true)
  })
})
