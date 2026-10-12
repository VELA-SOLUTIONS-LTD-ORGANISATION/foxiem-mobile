import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  IPAD_SIZE,
  IOS_SIZE,
  PACKAGE_ID,
  ROOT,
  SCENES,
  SCENE_FILES,
  ensureDir,
  pngInfo,
  rawDir,
  requestedClasses,
  requestedLocales,
  screenshotEnv,
  screenshotUrl,
  sleep,
} from './common.mjs';

function simctl(args) {
  const result = spawnSync('xcrun', ['simctl', ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'simctl failed');
  }
  return result.stdout;
}

function findDevice(preferred, fallback) {
  const data = JSON.parse(simctl(['list', 'devices', '-j']));
  const all = Object.values(data.devices).flat();
  const match = (name) => all.find((device) => device.name === name && device.isAvailable);
  if (preferred && match(preferred)) {
    return match(preferred);
  }
  if (typeof fallback === 'function') {
    return fallback(all);
  }
  return null;
}

async function boot(device) {
  if (device.state !== 'Booted') {
    console.log(`Booting ${device.name} ${device.udid}`);
    spawnSync('xcrun', ['simctl', 'boot', device.udid]);
    spawnSync('open', ['-a', 'Simulator']);
    spawnSync('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  } else {
    console.log(`Reusing booted ${device.name}`);
  }
}

function resolveIosClass(item) {
  if (item.slot === 'iphone-6.9') {
    const device = findDevice(item.simulator, (all) => all.find((candidate) => /iPhone 1[56] Pro Max/.test(candidate.name) && candidate.isAvailable));
    return { device, size: IOS_SIZE };
  }
  if (item.slot === 'ipad-13') {
    const device = findDevice(item.simulator, (all) =>
      all.find((candidate) => /iPad Pro 13/.test(candidate.name) && candidate.isAvailable),
    );
    return { device, size: IPAD_SIZE };
  }
  return { device: null, size: item.size };
}

async function main() {
  if (process.platform !== 'darwin') {
    console.log('No Xcode on this host; capturing iOS store sizes from Expo web.');
    const web = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'store-screenshots', 'web.mjs')], {
      stdio: 'inherit',
      env: process.env,
    });
    process.exit(web.status ?? 1);
  }
  const classes = requestedClasses().filter((item) => item.platform === 'ios' && item.enabled !== false && item.simulator);
  if (!classes.length) {
    console.log('No enabled iOS screenshot classes.');
    return;
  }
  const locales = requestedLocales();
  const first = resolveIosClass(classes[0]);
  if (!first.device) {
    throw new Error(`No available simulator for ${classes[0].name}`);
  }
  await boot(first.device);
  const bundled = spawnSync('xcrun', ['simctl', 'get_app_container', first.device.udid, PACKAGE_ID, 'app'], { encoding: 'utf8' });
  if (bundled.status !== 0 || !bundled.stdout.trim()) {
    console.log('Installing iOS debug build once');
    const install = spawnSync('npx', ['expo', 'run:ios', '--no-bundler'], {
      cwd: ROOT,
      env: screenshotEnv(),
      encoding: 'utf8',
      shell: true,
      timeout: 20 * 60 * 1000,
    });
    if (install.status !== 0) {
      throw new Error(install.stderr || install.stdout);
    }
  }

  for (const item of classes) {
    const resolved = resolveIosClass(item);
    if (!resolved.device) {
      console.warn(`Skipping ${item.name}: simulator not installed (${item.simulator})`);
      continue;
    }
    await boot(resolved.device);
    spawnSync('xcrun', ['simctl', 'status_bar', resolved.device.udid, 'override', '--time', '9:41', '--batteryLevel', '100', '--cellularMode', 'active']);
    for (const locale of locales) {
      const out = rawDir(locale, 'ios', item.slot);
      ensureDir(out);
      for (const scene of SCENES) {
        const url = screenshotUrl(scene, locale);
        console.log(`Capturing ios/${item.slot} ${locale} ${scene}`);
        spawnSync('xcrun', ['simctl', 'openurl', resolved.device.udid, url]);
        await sleep(scene === 'paywall' || scene === 'home' ? 8000 : 3500);
        const file = path.join(out, SCENE_FILES[scene]);
        spawnSync('xcrun', ['simctl', 'io', resolved.device.udid, 'screenshot', file]);
        const info = pngInfo(file);
        if (info.width !== resolved.size.width || info.height !== resolved.size.height) {
          console.warn(`${file} is ${info.width}x${info.height} (expected ${resolved.size.width}x${resolved.size.height})`);
        }
      }
      if (item.slot === 'iphone-6.9' && locale === 'en-GB') {
        const paywall = path.join(out, SCENE_FILES.paywall);
        const iap = path.join(ROOT, 'store-assets', 'ios', 'iap-review');
        ensureDir(iap);
        if (fs.existsSync(paywall)) {
          for (const name of ['foxiem_pro_monthly.png', 'foxiem_pro_yearly.png', 'foxiem_pro_lifetime.png']) {
            fs.copyFileSync(paywall, path.join(iap, name));
          }
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
