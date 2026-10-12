import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import {
  AVD_NAME,
  ANDROID_SIZE,
  PACKAGE_ID,
  ROOT,
  SCENES,
  SCENE_FILES,
  adbBin,
  androidSdk,
  avdManagerBin,
  emulatorBin,
  ensureDir,
  flattenPngToRgb,
  pngInfo,
  rawDir,
  requestedClasses,
  requestedLocales,
  screenshotEnv,
  screenshotUrl,
  sleep,
  waitFor,
} from './common.mjs';

function devices() {
  const text = spawnSync(adbBin(), ['devices'], { encoding: 'utf8' }).stdout;
  return text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => /\tdevice$/.test(row))
    .map((row) => row.split(/\s+/)[0]);
}

function nativeSize(id) {
  const text = spawnSync(adbBin(), ['-s', id, 'shell', 'wm', 'size'], { encoding: 'utf8' }).stdout;
  return text;
}

function findSizedDevice() {
  for (const id of devices()) {
    if (nativeSize(id).includes(`${ANDROID_SIZE.width}x${ANDROID_SIZE.height}`)) {
      return id;
    }
  }
  return null;
}

function avdExists(name) {
  const ini = path.join(os.homedir(), '.android', 'avd', `${name}.ini`);
  return fs.existsSync(ini);
}

function patchAvdConfig(name) {
  const file = path.join(os.homedir(), '.android', 'avd', `${name}.avd`, 'config.ini');
  if (!fs.existsSync(file)) {
    return;
  }
  const overrides = {
    'PlayStore.enabled': 'yes',
    'hw.lcd.width': String(ANDROID_SIZE.width),
    'hw.lcd.height': String(ANDROID_SIZE.height),
    'hw.lcd.depth': '32',
    'hw.gpu.enabled': 'yes',
    'hw.gpu.mode': 'host',
    'fastboot.forceFastBoot': 'yes',
    'fastboot.forceColdBoot': 'no',
    'hw.keyboard': 'yes',
    'hw.ramSize': '4096',
    'showDeviceFrame': 'no',
    'skin.path': '_no_skin',
  };
  const values = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    values.set(match[1].trim(), match[2].trim());
  }
  for (const [key, value] of Object.entries(overrides)) {
    values.set(key, value);
  }
  fs.writeFileSync(file, [...values.entries()].map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
}

function ensureAvd() {
  if (avdExists(AVD_NAME)) {
    patchAvdConfig(AVD_NAME);
    console.log(`Reusing AVD ${AVD_NAME}`);
    return;
  }
  const manager = avdManagerBin();
  const image = 'system-images;android-34;google_apis_playstore;x86_64';
  console.log(`Creating AVD ${AVD_NAME} (${image}, Nexus 5 = 1080x1920)`);
  const created = spawnSync(manager, ['create', 'avd', '-n', AVD_NAME, '-k', image, '-d', '7', '--force'], {
    input: 'no\n',
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ANDROID_SDK_ROOT: androidSdk(), ANDROID_HOME: androidSdk() },
  });
  if (created.status !== 0) {
    throw new Error(`avdmanager failed: ${created.error?.message || ''}\n${created.stderr || ''}\n${created.stdout || ''}`);
  }
  patchAvdConfig(AVD_NAME);
}

async function ensureEmulator() {
  if (process.env.STORE_SCREENSHOT_COLD_BOOT === '1') {
    for (const id of devices()) {
      console.log(`Cold boot: stopping ${id}`);
      spawnSync(adbBin(), ['-s', id, 'emu', 'kill']);
    }
    await waitFor('emulator gone', 60_000, async () => devices().length === 0);
  }
  const existing = findSizedDevice();
  if (existing) {
    console.log(`Reusing emulator ${existing} (${nativeSize(existing).trim()})`);
    process.env.ANDROID_SERIAL = existing;
    return existing;
  }
  ensureAvd();
  const before = new Set(devices());
  const emu = emulatorBin();
  const cold = process.env.STORE_SCREENSHOT_COLD_BOOT === '1';
  console.log(`Booting ${AVD_NAME} with -gpu host${cold ? ' (cold, -no-snapshot-load)' : ' (Quick Boot)'}`);
  const log = fs.openSync(path.join(os.tmpdir(), 'foxiem-emulator.log'), 'a');
  const args = ['-avd', AVD_NAME, '-gpu', 'host', '-no-audio', '-no-boot-anim'];
  if (cold) {
    args.push('-no-snapshot-load');
  }
  const child = spawn(emu, args, {
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: false,
  });
  child.unref();
  await waitFor('adb device', 180_000, async () => devices().some((id) => !before.has(id)) || devices().length > 0);
  await waitFor('boot complete', 300_000, async () => {
    const id = findSizedDevice() ?? devices().find((item) => !before.has(item)) ?? devices()[0];
    if (!id) {
      return false;
    }
    process.env.ANDROID_SERIAL = id;
    return spawnSync(adbBin(), ['-s', id, 'shell', 'getprop', 'sys.boot_completed'], { encoding: 'utf8' }).stdout.trim() === '1';
  });
  const id = findSizedDevice();
  if (!id) {
    throw new Error(`No emulator with native ${ANDROID_SIZE.width}x${ANDROID_SIZE.height}. wm size: ${devices().map((item) => `${item} ${nativeSize(item).trim()}`).join('; ')}`);
  }
  process.env.ANDROID_SERIAL = id;
  return id;
}

function demoMode() {
  const cmds = [
    ['shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1'],
    ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'enter'],
    ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'clock', '-e', 'hhmm', '0941'],
    ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'network', '-e', 'wifi', 'show', '-e', 'level', '4', '-e', 'mobile', 'show', '-e', 'datatype', 'hide'],
    ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'battery', '-e', 'level', '100', '-e', 'plugged', 'false'],
    ['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', '-e', 'command', 'notifications', '-e', 'visible', 'false'],
    ['shell', 'settings', 'put', 'system', 'accelerometer_rotation', '0'],
    ['shell', 'settings', 'put', 'system', 'user_rotation', '0'],
    ['shell', 'input', 'keyevent', '4'],
  ];
  for (const args of cmds) {
    spawnSync(adbBin(), args, { encoding: 'utf8' });
  }
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

async function ensureMetro() {
  if (await portOpen(8081)) {
    console.log('Reusing Metro on :8081 (set EXPO_PUBLIC_STORE_SCREENSHOTS=1 if this is a foreign bundler)');
    spawnSync(adbBin(), ['reverse', 'tcp:8081', 'tcp:8081']);
    return;
  }
  console.log('Starting Metro with screenshot + RevenueCat-in-dev flags');
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'start', '--port', '8081', '--dev-client'], {
    cwd: ROOT,
    env: screenshotEnv(),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  child.unref();
  await waitFor('Metro :8081', 120_000, () => portOpen(8081));
  spawnSync(adbBin(), ['reverse', 'tcp:8081', 'tcp:8081']);
}

function appInstalled() {
  const out = spawnSync(adbBin(), ['shell', 'pm', 'path', PACKAGE_ID], { encoding: 'utf8' });
  return out.status === 0 && Boolean(out.stdout.trim());
}

async function ensureApp() {
  if (appInstalled()) {
    console.log(`Reusing installed ${PACKAGE_ID}`);
    return false;
  }
  console.log('Installing debug build once (gradlew installDebug)');
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const androidDir = path.join(ROOT, 'android');
  const result = fs.existsSync(path.join(androidDir, gradlew === 'gradlew.bat' ? 'gradlew.bat' : 'gradlew'))
    ? spawnSync(gradlew, ['installDebug'], {
        cwd: androidDir,
        env: { ...screenshotEnv(), ANDROID_SERIAL: process.env.ANDROID_SERIAL },
        encoding: 'utf8',
        shell: process.platform === 'win32',
        timeout: 25 * 60 * 1000,
      })
    : spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'run:android', '--no-bundler'], {
        cwd: ROOT,
        env: screenshotEnv(),
        encoding: 'utf8',
        shell: process.platform === 'win32',
        timeout: 25 * 60 * 1000,
      });
  if (result.status !== 0) {
    throw new Error(`debug install failed:\n${result.stdout}\n${result.stderr}`);
  }
  await waitFor('package installed', 60_000, async () => appInstalled());
  return true;
}

function dismissSystemUi() {
  spawnSync(adbBin(), ['shell', 'am', 'broadcast', '-a', 'android.intent.action.CLOSE_SYSTEM_DIALOGS']);
}

async function waitForApp() {
  await sleep(300);
}

function openScene(scene, locale) {
  const url = screenshotUrl(scene, locale);
  const result = spawnSync(
    adbBin(),
    [
      'shell',
      'am',
      'start',
      '-W',
      '--activity-single-top',
      '-a',
      'android.intent.action.VIEW',
      '-c',
      'android.intent.category.BROWSABLE',
      '-d',
      url,
      '-p',
      PACKAGE_ID,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`Failed to open ${url}: ${result.stderr || result.stdout}`);
  }
}

function foxiemResumed() {
  const out = spawnSync(adbBin(), ['shell', 'dumpsys', 'activity', 'activities'], { encoding: 'utf8' }).stdout;
  return /topResumedActivity=.*co\.uk\.solutionvela\.foxiem\/\.MainActivity/.test(out);
}

function hasAnrDialog() {
  const window = spawnSync(adbBin(), ['shell', 'dumpsys', 'window', 'windows'], { encoding: 'utf8' }).stdout;
  return /Application Not Responding|isn't responding/i.test(window);
}

function dismissAnr() {
  spawnSync(adbBin(), ['shell', 'input', 'tap', '540', '1080']);
}

async function waitUntilFoxiemIdle() {
  await waitFor('Foxiem idle', 90_000, async () => {
    if (hasAnrDialog()) {
      dismissAnr();
      return false;
    }
    return foxiemResumed();
  });
  await sleep(1500);
}

async function launchFoxiem(scene, locale) {
  spawnSync(adbBin(), ['shell', 'pm', 'disable-user', '--user', '0', 'com.android.chrome']);
  spawnSync(adbBin(), ['shell', 'am', 'force-stop', 'com.android.chrome']);
  openScene(scene, locale);
  await waitUntilFoxiemIdle();
}

function captureTo(file) {
  const shot = spawnSync(adbBin(), ['exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
  if (shot.status !== 0) {
    throw new Error(`screencap failed: ${shot.stderr?.toString() ?? ''}`);
  }
  fs.writeFileSync(file, shot.stdout);
  flattenPngToRgb(file);
  const info = pngInfo(file);
  if (info.width !== ANDROID_SIZE.width || info.height !== ANDROID_SIZE.height) {
    throw new Error(`${file} is ${info.width}x${info.height}, expected ${ANDROID_SIZE.width}x${ANDROID_SIZE.height}`);
  }
  if (info.colorType === 4 || info.colorType === 6) {
    throw new Error(`${file} still has alpha`);
  }
}

async function main() {
  const classes = requestedClasses().filter((item) => item.platform === 'android' && item.enabled !== false && item.size);
  if (!classes.length) {
    console.log('No enabled Android screenshot classes.');
    return;
  }
  const locales = requestedLocales();
  const rebuilt = await (async () => {
    await ensureEmulator();
    demoMode();
    await ensureMetro();
    return ensureApp();
  })();
  await launchFoxiem(SCENES[0], locales[0]);
  for (const device of classes) {
    for (const locale of locales) {
      const out = rawDir(locale, 'android', device.slot);
      ensureDir(out);
      let previousHash = '';
      for (const scene of SCENES) {
        console.log(`Capturing android/${device.slot} ${locale} ${scene}`);
        const file = path.join(out, SCENE_FILES[scene]);
        let info = null;
        for (let attempt = 1; attempt <= 4; attempt += 1) {
          if (hasAnrDialog()) {
            dismissAnr();
            await sleep(4000);
          }
          if (!foxiemResumed()) {
            await launchFoxiem(scene, locale);
          } else {
            openScene(scene, locale);
          }
          await waitUntilFoxiemIdle();
          await sleep(scene === 'paywall' ? 4000 : 2500);
          dismissSystemUi();
          captureTo(file);
          info = pngInfo(file);
          if (hasAnrDialog() || info.bytes < 20_000) {
            console.warn(`  retry ${attempt}: ANR or empty frame`);
            dismissAnr();
            await sleep(4000);
            continue;
          }
          if (info.sha256 !== previousHash) {
            break;
          }
          console.warn(`  retry ${attempt}: ${scene} still matches the previous frame`);
        }
        if (!info) {
          throw new Error(`Could not capture ${locale} ${scene}`);
        }
        previousHash = info.sha256;
        console.log(`  wrote ${path.relative(ROOT, file)} ${info.width}x${info.height}`);
      }
    }
  }
  console.log(rebuilt ? 'App was installed for this run.' : 'App install was reused.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
