import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildPublicApiManifest } from './public-api-manifest.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tscPath = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const update = process.argv.includes('--update');

// One snapshot per published entry point. A subpath the root entry does not re-export is a
// separate public surface, and a surface with no snapshot is one that can change without anyone
// noticing until a consumer's build breaks.
const ENTRIES = [
    { entry: 'index.d.ts', snapshot: join(root, 'tests', 'api', 'sschart.d.ts'), name: '.' },
    { entry: join('chart', 'ui.d.ts'), snapshot: join(root, 'tests', 'api', 'sschartui.d.ts'), name: './ui' },
];
const temp = await mkdtemp(join(tmpdir(), 'sschart-api-'));

try {
    const result = spawnSync(
        process.execPath,
        [tscPath, '-p', join(root, 'tsconfig.api.json'), '--outDir', temp],
        { cwd: root, encoding: 'utf8' },
    );
    if (result.status !== 0) {
        process.stderr.write(result.stdout || '');
        process.stderr.write(result.stderr || '');
        throw new Error(`TypeScript declaration emit failed with exit code ${result.status ?? 1}.`);
    }

    for (const { entry, snapshot, name } of ENTRIES) {
        const normalized = await buildPublicApiManifest(temp, entry);

        if (update) {
            await mkdir(dirname(snapshot), { recursive: true });
            await writeFile(snapshot, normalized, 'utf8');
            console.log('updated ' + snapshot);
            continue;
        }

        let expected;
        try {
            expected = (await readFile(snapshot, 'utf8')).replaceAll('\r\n', '\n');
        } catch {
            throw new Error(`Public API snapshot for '${name}' is missing. Run npm run api:update.`);
        }

        if (expected !== normalized) {
            throw new Error(
                `Public API of '${name}' changed. Review the generated declaration, then run `
                + 'npm run api:update if the change is intentional.',
            );
        }
        console.log(`public API snapshot matches for '${name}'`);
    }
} finally {
    await rm(temp, { recursive: true, force: true });
}
