export interface PolyfillOption {
  /**
   * The name of the polyfill
   */
  name: string
  /**
   * browser compatibility
   */
  browserlist?: string | readonly string[] | null
  /**
   * Other polyfills that this polyfill depends on
   */
  relyOn?: string | readonly string[] | null
  /**
   * The setup function for the polyfill
   */
  setup: (self: typeof globalThis) => void
}

export function definePolyfill(options: PolyfillOption): PolyfillOption {
  return options
}
