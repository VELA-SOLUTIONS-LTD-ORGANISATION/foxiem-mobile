// Proves the production JavaScript bundle contains no developer tooling.
//
// It exports the real release bundle (dev=false, the same path EAS uses) for both platforms without
// minification or bytecode, so identifiers and strings stay searchable, then fails if anything from
// `src/dev` (developer panel, purchase simulator, sample data) is present, and checks that the parts
// that must ship (RevenueCat adapter, product ids, the unavailable adapter) are.
//
//   node scripts/verify-production-bundle.mjs            # export both platforms and check
//   node scripts/verify-production-bundle.mjs --reuse    # check an existing export
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.expo', 'verify-bundle');
const platforms = ['android', 'ios'];

/** Must NOT appear in a release bundle. */
const FORBIDDEN = [
  'DeveloperPanel',
  'createSimulatedAdapter',
  'simulatedAdapter',
  'buildSampleTrackers',
  'Knitting rows for the winter blanket project',
  'devSeed',
  'devExpire',
];

/** Must appear: proof the check is reading a real, complete bundle and billing really ships. */
const REQUIRED = ['foxiem_pro_yearly', 'foxiem_pro_lifetime', 'createRevenueCatAdapter', 'unavailableAdapter', 'appl_', 'goog_'];

function collectBundles(dir) {
  const bundles = [];
  const walk = (current) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|hbc)$/.test(entry.name) && full.includes(`${path.sep}js${path.sep}`)) bundles.push(full);
    }
  };
  walk(dir);
  return bundles;
}

if (!process.argv.includes('--reuse')) {
  fs.rmSync(out, { recursive: true, force: true });
  for (const platform of platforms) {
    console.log(`Exporting the ${platform} release bundle...`);
    const result = spawnSync(
      'npx',
      ['expo', 'export', '--platform', platform, '--output-dir', path.join(out, platform), '--no-minify', '--no-bytecode', '--clear'],
      { cwd: root, stdio: 'inherit', shell: true, env: { ...process.env, NODE_ENV: 'production' } },
    );
    if (result.status !== 0) {
      console.error(`expo export failed for ${platform}`);
      process.exit(1);
    }
  }
}

let failed = false;
for (const platform of platforms) {
  const bundles = collectBundles(path.join(out, platform));
  if (bundles.length === 0) {
    console.error(`${platform}: no JavaScript bundle found under ${path.relative(root, out)}`);
    failed = true;
    continue;
  }
  const text = bundles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const leaked = FORBIDDEN.filter((marker) => text.includes(marker));
  const missing = REQUIRED.filter((marker) => !text.includes(marker));
  console.log(`${platform}: ${(text.length / 1024 / 1024).toFixed(1)} MB across ${bundles.length} file(s)`);
  if (leaked.length) {
    console.error(`  FAIL developer code in the ${platform} release bundle: ${leaked.join(', ')}`);
    failed = true;
  }
  if (missing.length) {
    console.error(`  FAIL expected release code missing from the ${platform} bundle: ${missing.join(', ')}`);
    failed = true;
  }
  if (!leaked.length && !missing.length) {
    console.log(`  PASS no developer tooling; billing code present`);
  }
}
process.exit(failed ? 1 : 0);
