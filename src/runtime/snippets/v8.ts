// Vendored from @vitejs/plugin-legacy v8 — DO NOT ALTER THIS CONTENT.
// Source: https://github.com/vitejs/vite/blob/v8.0.0/packages/plugin-legacy/src/snippets.ts
// https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc
//
// v8 adds `import.meta.resolve` support detection (`detectImportMetaResolveSupportModule`)
// as a prefix to `detectModernBrowserCode` and `modernChunkLegacyGuard`.

/** @vitejs/plugin-legacy v8: `safari10NoModuleFix` (unchanged from v7) */
export const safari10NoModuleFix: string = `!function(){var e=document,t=e.createElement("script");if(!("noModule"in t)&&"onbeforeload"in t){var n=!1;e.addEventListener("beforeload",(function(e){if(e.target===t)n=!0;else if(!e.target.hasAttribute("nomodule")||!n)return;e.preventDefault()}),!0),t.type="module",t.src=".",e.head.appendChild(t),t.remove()}}();`

/** @vitejs/plugin-legacy v8: `legacyPolyfillId` */
export const legacyPolyfillId = 'vite-legacy-polyfill'

/** @vitejs/plugin-legacy v8: `legacyEntryId` */
export const legacyEntryId = 'vite-legacy-entry'

/** @vitejs/plugin-legacy v8: `systemJSInlineCode` (unchanged from v7) */
export const systemJSInlineCode: string = `System.import(document.getElementById('${legacyEntryId}').getAttribute('data-src'))`

const detectModernBrowserVarName = '__vite_is_modern_browser'

// v8 addition: inline module to detect `import.meta.resolve` support.
const detectImportMetaResolveSupportModule: string
  = 'data:text/javascript,if(!import.meta.resolve)throw Error("import.meta.resolve not supported")'

/** @vitejs/plugin-legacy v8: `detectModernBrowserDetector` (unchanged from v7) */
export const detectModernBrowserDetector: string = `${['import', 'meta', 'url'].join('.')};import("_").catch(()=>1);(async function*(){})().next()`

/** @vitejs/plugin-legacy v8: `detectModernBrowserCode` (adds import.meta.resolve check) */
export const detectModernBrowserCode: string = `import'${detectImportMetaResolveSupportModule}';${detectModernBrowserDetector};window.${detectModernBrowserVarName}=true`

/** @vitejs/plugin-legacy v8: `dynamicFallbackInlineCode` (unchanged from v7) */
export const dynamicFallbackInlineCode: string = `!function(){if(window.${detectModernBrowserVarName})return;console.warn("vite: loading legacy chunks, syntax error above and the same error below should be ignored");var e=document.getElementById("${legacyPolyfillId}"),n=document.createElement("script");n.src=e.src,n.onload=function(){${systemJSInlineCode}},document.body.appendChild(n)}();`

/** @vitejs/plugin-legacy v8: `modernChunkLegacyGuard` (adds import.meta.resolve check) */
export const modernChunkLegacyGuard: string = `import'${detectImportMetaResolveSupportModule}';export function __vite_legacy_guard(){${detectModernBrowserDetector}};`
