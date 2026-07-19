// Vendored from @vitejs/plugin-legacy v8 — DO NOT ALTER THIS CONTENT.
// Source: https://github.com/vitejs/vite/blob/v8.0.0/packages/plugin-legacy/src/snippets.ts
// https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc

export const safari10NoModuleFix: string = `!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();`

export const legacyPolyfillId = 'vite-legacy-polyfill'

export const legacyEntryId = 'vite-legacy-entry'

export const systemJSInlineCode: string = `System.import(document.getElementById('${legacyEntryId}').getAttribute('data-src'))`

const detectModernBrowserVarName = '__vite_is_modern_browser'

// Built via `[...].join('.')` so the literal `import.meta.*` does not appear in
// the source — Nitro's server-bundle replace would otherwise rewrite it to
// `globalThis._importMeta_.*` at build time and the inline script's CSP hash
// would diverge from `@vitejs/plugin-legacy`'s exported `cspHashes`.
const importMetaResolve = ['import', 'meta', 'resolve'].join('.')
const detectImportMetaResolveSupportModule: string
  = `data:text/javascript,if(!${importMetaResolve})throw Error("${importMetaResolve} not supported")`

export const detectModernBrowserDetector: string = `${['import', 'meta', 'url'].join('.')};import("_").catch(()=>1);(async function*(){})().next()`

export const detectModernBrowserCode: string = `import'${detectImportMetaResolveSupportModule}';${detectModernBrowserDetector};window.${detectModernBrowserVarName}=true`

export const dynamicFallbackInlineCode: string = `!function(){if(window.${detectModernBrowserVarName})return;console.warn("vite: loading legacy chunks, syntax error above and the same error below should be ignored");var e=document.getElementById("${legacyPolyfillId}"),n=document.createElement("script");n.src=e.src,n.onload=function(){${systemJSInlineCode}},document.body.appendChild(n)}();`

export const modernChunkLegacyGuard: string = `import'${detectImportMetaResolveSupportModule}';export function __vite_legacy_guard(){${detectModernBrowserDetector}};`
