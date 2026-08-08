# AGENTS.md -- Charts

## What this is

`@stocksharp/chart` (see `package.json` for the current version) is an in-house canvas
trading-chart engine with a lightweight-charts-shaped API, published as the
`window.SSChart` global. `src/sschart.ts` is the engine (single file, no runtime
deps); `src/chart/` is the full StockSharp web-terminal chart stack (indicator
engine, legend, panes, context menu, picker dialog),
ported verbatim from `Broker.Web.Trader` and decoupled so it builds standalone.
`demo/` is a live showcase deployed to GitHub Pages.

The ~165 indicators themselves are **not here** — they live in
[`@stocksharp/indicators`](https://github.com/StockSharp/JS-Indicators), which this
repo depends on. What stays here is everything about *drawing* them: the engine that
binds an indicator to a pane and a series, the renderer, the painters, the settings
widget and the picker. Arithmetic bugs, catalogue entries and C# parity belong in
that repo; if a fix is about a number rather than a pixel, it is in the wrong
repository.

This is a **TypeScript / Node** repo (ESM, `"type": "module"`) built with
**esbuild** — no bundler config framework, one runtime dependency (the indicator
package). Dev deps are only `esbuild`, `typescript`, `@playwright/test`.

Workspace-wide agent rules live in the configs repo (`configs/instructions.md`)
and load automatically; this file is repo-specific only.

## Build, test, run

`npm install` once (fetches esbuild / playwright / typescript). Then:

| Command | What it does |
|---|---|
| `npm run build` | esbuild `src` -> `dist/sschart.js` (SSChart global) + `dist/chart-app.js` |
| `npm run serve` | static server on `http://localhost:8791/demo/index.html` (HOST/PORT env overridable; default HOST `0.0.0.0` so it is LAN-reachable) |
| `npm test` | `typecheck:core` + `api:check` + bundle unit tests (`build-tests.mjs`) + `node --test` over `tests/_dist/**/*.test.cjs` |
| `npm run typecheck:core` | `tsc -p tsconfig.typecheck.json` (no emit) — covers `src/core/**` **and `src/chart/**`** |
| `npm run api:check` / `api:update` | verify / regenerate the public-API snapshot |
| `npm run test:browser` | build + build browser fixtures + Playwright (`tests/browser`) |
| `npm run test:browser:update` | same, but rewrites visual snapshots |
| `npm run test:performance` | Playwright perf specs, `--project=chromium-dpr1` |

`npm test` needs no browser and no .NET SDK — the C# parity suite moved out with the
indicators and now runs in the JS-Indicators repo. Browser tests need
`npx playwright install --with-deps chromium` first.

The indicator package is consumed from a **sibling checkout**
(`"@stocksharp/indicators": "file:../JS-Indicators"`), so `npm install` here needs
`D:\stocksharp\JS-Indicators` to exist and to have been built. Once the package is on
npm this becomes an ordinary version range.

## Layout

```
src/sschart.ts   the engine (single file, no deps); src/index.ts exports the SSChart global
src/chart/       terminal chart stack: app.ts (demo wiring), indicators/ (engine, renderer,
                 settings, painters — the drawing half only), chart-legend, chart-pane-manager,
                 chart-context-menu, indicator-dialog, chart-type-switcher, i18n, utils
src/core, data, drawings, orderflow, persistence, primitives, series, time, trading, workspace
demo/            index.html + CSS + seeded sample-data.js (the GitHub Pages site)
tests/           node:test unit specs (*.test.js),
                 headless-dom.js + chart-construction.test.js (construct a real chart, no browser),
                 render/recording-context.js,
                 tests/browser/ (Playwright *.spec.ts + visual snapshots),
                 tests/api/sschart.d.ts (public-API snapshot), tests/types/ (type-level tests,
                 incl. indicators-boundary.ts — see below)
tools/           check-public-api.mjs, public-api-manifest.mjs
build*.mjs       build.mjs (bundles), build-tests.mjs, build-browser-fixtures.mjs, serve.mjs
```

Build outputs are git-ignored: `dist/`, `tests/_dist/`, `test-results/`,
`playwright-report/`, `tests/browser/fixtures/_dist/`.

## Conventions

- Engine API `time` is UNIX **seconds** (not ms).
- Order flow uses explicit `FootprintBar` / `ApproximateFootprintBar`
  discriminated contracts — the library never invents a bid/ask split or passes
  candle-volume distribution off as exact footprint data. Keep that separation.
- Indicators are drawn as plain lines unless their catalogue entry (which comes from
  `@stocksharp/indicators`) names a registered `painter`; unknown painter names fall
  back to lines safely.

## Releasing / publishing

No npm/nuget artifact — the deliverable is the **demo site**. `.github/workflows/pages.yml`
runs on push/PR to `main`: `npm ci` -> `npm run build` -> `npm test` -> stage
`demo/` + `dist/` -> deploy to GitHub Pages
(`https://stocksharp.github.io/Charts/demo/`). Node 22 in CI.

**Playwright does NOT run in CI, by design — know what that costs you.** GitHub never
launches a browser here; rendering is covered browser-free by the draw-call snapshots
in `tests/render/**`, and the interaction / hit-test / lifecycle specs are a local
`npm run test:browser`.

## Gotchas / do not break

- **Public API is snapshot-gated.** `check-public-api.mjs` emits declarations via
  `tsconfig.api.json` and diffs them against `tests/api/sschart.d.ts`. Any public
  surface change fails `npm test` until you run `npm run api:update` and commit the
  updated snapshot.
- **Rendering is gated by draw-call snapshots, not pixels.** The pixel specs were
  removed; `tests/render/*.test.js` record the ordered canvas calls each series,
  primitive and indicator painter makes and diff them against
  `tests/render/__snapshots__`. A missing snapshot file is a loud failure — it is
  never created for you. Regenerate deliberately with `UPDATE_SNAPSHOTS=1 npm test`
  and read the diff before committing it.
- **Playwright specs assert behaviour, not appearance.** They still pin
  `colorScheme: dark`, `locale: en-US`, `timezoneId: UTC` and two DPR projects for
  determinism — don't change those casually. `npm run test:browser:update` rewrites
  nothing pixel-based any more; the `toHaveScreenshot` threshold in
  `playwright.config.ts` is left in place for specs that may want it again.
- **The indicators are loaded at runtime, not bundled in.** `build.mjs` resolves
  `@stocksharp/indicators` to a stub that reads the `SSIndicators` global, and copies the
  package's own `dist/ssindicators.js` beside our bundles. That is what lets the indicators be
  updated by replacing one file — no chart rebuild, no redeploy of the embedding page. A page
  must load `ssindicators.js` **before** `sschart.js` / `chart-app.js`; forget it and the stub
  throws a message naming the missing script. Two build guards hold the arrangement up: the
  chart bundles must contain zero `registerIndicator(` calls, and `ssindicators.js` must contain
  many. Only the IIFE bundles are external — `build-tests.mjs` and the browser fixtures still
  inline the package, because a test wants the real code, not a global.
- **The indicators are a dependency, not a folder.** Nothing under `src/` computes an
  indicator value any more; `@stocksharp/indicators` does. Fixing arithmetic, adding a
  catalogue entry or chasing a C# divergence means working in that repo and then
  bumping the dependency here — not patching a value on the way to the renderer.
- **The boundary types are pinned by a test, not by discipline.** The chart and the
  package each declare their own `Time`, `CandlestickData` and `LineStyleValue`, matched
  structurally so no conversion is needed at the call site.
  `tests/types/indicators-boundary.ts` asserts they stay mutually assignable; widen one
  side and the typecheck fails there rather than in a consumer's build.
- **`createChart` requires a real `HTMLElement`.** The constructor writes
  `dataset`, `style`, `className` and calls `append`/`appendChild`/`getContext`.
  `tests/headless-dom.js` is the sanctioned browser-free double, and
  `chart-construction.test.js` pins that surface so a new DOM dependency fails here
  rather than in a downstream harness.
- Chart modules are the same code the web terminal runs; engine bug fixes made
  here still need folding back into the terminal's copy (tracked as follow-up).
