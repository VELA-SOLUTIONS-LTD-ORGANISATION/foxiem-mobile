import fs from 'node:fs';
import path from 'node:path';

import { pngInfo, rawDir, requestedClasses, requestedLocales, ROOT, SCENES, SCENE_FILES } from './common.mjs';

function inspectDir(rel, expected) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) {
    return { ok: false, files: [], errors: [`missing directory ${rel}`] };
  }
  const errors = [];
  const files = [];
  const hashes = new Map();
  for (const scene of SCENES) {
    const name = SCENE_FILES[scene];
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      errors.push(`missing ${rel}/${name}`);
      continue;
    }
    let info;
    try {
      info = pngInfo(file);
    } catch (error) {
      errors.push(`${rel}/${name}: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    if (expected && (info.width !== expected.width || info.height !== expected.height)) {
      errors.push(`${rel}/${name}: ${info.width}x${info.height}, expected ${expected.width}x${expected.height}`);
    }
    if (info.height <= info.width) {
      errors.push(`${rel}/${name}: not portrait`);
    }
    if (info.colorType === 4 || info.colorType === 6) {
      errors.push(`${rel}/${name}: has alpha (color type ${info.colorType})`);
    }
    if (info.bytes < 20_000) {
      errors.push(`${rel}/${name}: file too small (${info.bytes} bytes)`);
    }
    const previous = hashes.get(info.sha256);
    if (previous) {
      errors.push(`${rel}/${name} is identical to ${previous}`);
    }
    hashes.set(info.sha256, name);
    files.push({ name, ...info, path: `${rel}/${name}` });
  }
  return { ok: errors.length === 0, files, errors };
}

const locales = requestedLocales();
const classes = requestedClasses().filter((item) => item.enabled !== false && item.size);
const results = { generatedAt: new Date().toISOString(), slots: {} };
const lines = [];
let failed = false;

for (const locale of locales) {
  for (const item of classes) {
    const rel = path.relative(ROOT, rawDir(locale, item.platform, item.slot)).replaceAll('\\', '/');
    const result = inspectDir(rel, item.size);
    results.slots[`${locale}/${item.platform}/${item.slot}`] = result;
    const label = `${locale} ${item.platform}/${item.slot}`;
    if (result.ok) {
      lines.push(`OK ${label}: ${result.files.length} files`);
    } else {
      failed = true;
      lines.push(`FAIL ${label}`);
      for (const error of result.errors) {
        lines.push(`  - ${error}`);
      }
    }
  }
}

const iapDir = path.join(ROOT, 'store-assets/ios/iap-review');
const iapNames = ['foxiem_pro_monthly.png', 'foxiem_pro_yearly.png', 'foxiem_pro_lifetime.png'];
const iap = { ok: true, files: [], errors: [] };
if (process.platform === 'darwin') {
  for (const name of iapNames) {
    const file = path.join(iapDir, name);
    if (!fs.existsSync(file)) {
      iap.ok = false;
      iap.errors.push(`missing store-assets/ios/iap-review/${name}`);
      continue;
    }
    iap.files.push({ name, ...pngInfo(file) });
  }
  results.iap = iap;
  if (iap.ok) {
    lines.push(`OK iOS IAP review: ${iap.files.length} files`);
  } else {
    failed = true;
    lines.push('FAIL iOS IAP review');
    for (const error of iap.errors) {
      lines.push(`  - ${error}`);
    }
  }
}

const outDir = path.join(ROOT, 'store-assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(lines.join('\n'));
if (failed) {
  process.exit(1);
}
