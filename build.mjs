// Build the published package and the demo/unpkg bundles:
//   dist/esm/**      — typed ESM modules (tsc), the npm `main`/`exports` entry
//   dist/types/**    — .d.ts + declaration maps, the npm `types` entry
//   dist/sschart.js  — the engine as the IIFE global `SSChart` (unpkg/jsdelivr,
//                      and the <script> the demo pages load)
//   dist/chart-app.js — the terminal chart stack (indicator engine, renderer,
//                      panes, legend, context-menu, dialog) wired by
//                      src/chart/app.ts; used only by the demo terminal page.
//
//   npm install   # once, to get esbuild + typescript
//   node build.mjs
import { execFile } from 'node:child_process';
import { copyFile, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');

// Fixed child of this repository, never a caller-provided path.
await rm(dist, { recursive: true, force: true });

// Typed ESM + .d.ts for npm consumers (tsc drives the public graph from index.ts).
await execFileAsync(
    process.execPath,
    [join(here, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', join(here, 'tsconfig.build.json')],
    { cwd: here },
);

// The indicator package is NOT bundled in. It is loaded at runtime as its own script, so the
// indicators can be updated by replacing one file -- no rebuild of the chart, no redeploy of the
// page that embeds it. esbuild has no "map this import to that global" option for iife output, so
// the import is resolved to a stub module that reads the global the package publishes.
const INDICATORS_PACKAGE = '@stocksharp/indicators';
const INDICATORS_GLOBAL = 'SSIndicators';

const externalIndicators = {
    name: 'external-indicators',
    setup(build) {
        build.onResolve({ filter: /^@stocksharp\/indicators$/ }, () => ({
            path: INDICATORS_PACKAGE,
            namespace: 'external-global',
        }));
        build.onLoad({ filter: /.*/, namespace: 'external-global' }, () => ({
            // CommonJS on purpose: esbuild then turns every named import into a property read on
            // the global, which is what a script-tag consumer actually gets.
            contents: `
const indicators = globalThis.${INDICATORS_GLOBAL};
if (!indicators) {
    throw new Error(
        'SSChart: ${INDICATORS_PACKAGE} is missing. Load dist/ssindicators.js before this script '
        + '(it publishes the ${INDICATORS_GLOBAL} global).');
}
module.exports = indicators;
`,
            loader: 'js',
            resolveDir: here,
        }));
    },
};

// IIFE globals: the engine (unpkg/jsdelivr + demo) and the terminal demo app.
const targets = [
    { entryPoints: [join(here, 'src', 'index.ts')], outfile: join(dist, 'sschart.js'), globalName: 'SSChart' },
    { entryPoints: [join(here, 'src', 'chart', 'app.ts')], outfile: join(dist, 'chart-app.js') },
];

for (const t of targets) {
    await build({
        ...t,
        bundle: true,
        format: 'iife',
        sourcemap: true,
        target: 'es2020',
        logLevel: 'info',
        plugins: [externalIndicators],
    });
    console.log('built ' + t.outfile);
}

// Ship the package's own browser build beside ours, so the demo (and GitHub Pages, which copies
// dist/ wholesale) has the file the script tag asks for. Copied rather than rebuilt: it is the
// artifact the package publishes, and swapping it is the whole point of this arrangement.
const indicatorsDist = join(here, 'node_modules', '@stocksharp', 'indicators', 'dist');
for (const name of ['ssindicators.js', 'ssindicators.js.map']) {
    const from = join(indicatorsDist, name);
    if (!existsSync(from)) {
        throw new Error(
            `build: ${from} is missing. The indicator package ships it from its own build — run `
            + 'npm install (its prepare script builds dist/) before building the chart.');
    }
    await copyFile(from, join(dist, name));
}
console.log('copied ' + join(dist, 'ssindicators.js'));

// Build-integrity guards, one per half of the arrangement.
//
// 1. The registry is filled by load-time `registerIndicator(...)` side effects, and a wrong
//    "sideEffects" field lets a bundler tree-shake them away — silently emptying the catalogue
//    while every unit test still passes, because tests import the definitions directly. That
//    check now belongs on the file that carries them.
// 2. Our bundles must NOT carry them: if the import is ever resolved normally again, the
//    indicators get baked back in and updating the package alone stops working, which is a
//    regression nothing else would notice.
const MIN_INDICATOR_REGISTRATIONS = 50;
const countRegistrations = (file) => (readFileSync(file, 'utf8').match(/registerIndicator\(/g) || []).length;

const shipped = countRegistrations(join(dist, 'ssindicators.js'));
if (shipped < MIN_INDICATOR_REGISTRATIONS) {
    throw new Error(
        `build guard: ssindicators.js has only ${shipped} registerIndicator() calls `
        + `(expected >= ${MIN_INDICATOR_REGISTRATIONS}). Indicator definitions were tree-shaken `
        + 'away — check the indicator package "sideEffects" field.');
}

for (const name of ['sschart.js', 'chart-app.js']) {
    const file = join(dist, name);
    const inlined = countRegistrations(file);
    if (inlined > 0) {
        throw new Error(
            `build guard: ${name} contains ${inlined} registerIndicator() calls. The indicator `
            + 'package was bundled in instead of left external, so replacing ssindicators.js would '
            + 'no longer change anything — check the external-indicators plugin.');
    }
    if (!readFileSync(file, 'utf8').includes(INDICATORS_GLOBAL)) {
        throw new Error(`build guard: ${name} never references the ${INDICATORS_GLOBAL} global.`);
    }
}
console.log(`guard ok: ssindicators.js keeps ${shipped} registrations; the chart bundles reference the global instead of inlining them`);
