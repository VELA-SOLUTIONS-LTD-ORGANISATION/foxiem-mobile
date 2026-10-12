import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..');
export const PACKAGE_ID = 'co.uk.solutionvela.foxiem';
export const SCENES = ['home', 'tracker', 'insights', 'reminders', 'widgets', 'paywall'];
export const SCENE_FILES = {
  home: '01-home.png',
  tracker: '02-counter.png',
  insights: '03-insights.png',
  reminders: '04-reminders.png',
  widgets: '05-widgets.png',
  paywall: '06-pro.png',
};
export const STORE_LOCALES = ['en-GB', 'tr-TR', 'de-DE', 'fr-FR', 'es-ES', 'it-IT'];
export const ANDROID_SIZE = { width: 1080, height: 1920 };
export const IOS_SIZE = { width: 1320, height: 2868 };
export const IPAD_SIZE = { width: 2064, height: 2752 };
export const AVD_NAME = 'Foxiem_Screenshot_Play';

/** Store device classes. Tablets/Watch are declared but off until those listings are in use. */
export const DEVICE_CLASSES = {
  'iphone-6.9': { platform: 'ios', slot: 'iphone-6.9', simulator: 'iPhone 16 Pro Max', size: IOS_SIZE, enabled: true },
  'ipad-13': { platform: 'ios', slot: 'ipad-13', simulator: 'iPad Pro 13-inch (M4)', size: IPAD_SIZE, enabled: true },
  phone: { platform: 'android', slot: 'phone', avd: AVD_NAME, size: ANDROID_SIZE, enabled: true },
  'tablet-7': { platform: 'android', slot: 'tablet-7', enabled: false },
  'tablet-10': { platform: 'android', slot: 'tablet-10', enabled: false },
  watch: { platform: 'ios', slot: 'watch', enabled: false },
};

export function requestedLocales() {
  const raw = process.env.STORE_SCREENSHOT_LANGS;
  if (!raw) {
    return [...STORE_LOCALES];
  }
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const unknown = list.filter((item) => !STORE_LOCALES.includes(item));
  if (unknown.length) {
    throw new Error(`Unknown screenshot locale(s): ${unknown.join(', ')}`);
  }
  return list;
}

export function requestedScenes() {
  const raw = process.env.STORE_SCREENSHOT_SCENES;
  if (!raw) {
    return [...SCENES];
  }
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const unknown = list.filter((item) => !SCENES.includes(item));
  if (unknown.length) {
    throw new Error(`Unknown screenshot scene(s): ${unknown.join(', ')}`);
  }
  return list;
}

export function requestedClasses() {
  const raw = process.env.STORE_SCREENSHOT_CLASSES;
  const names = raw
    ? raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : Object.keys(DEVICE_CLASSES).filter((name) => DEVICE_CLASSES[name].enabled);
  return names.map((name) => {
    const item = DEVICE_CLASSES[name];
    if (!item) {
      throw new Error(`Unknown screenshot class: ${name}`);
    }
    return { name, ...item };
  });
}

export function rawDir(locale, platform, slot) {
  return path.join(ROOT, 'store-assets', 'raw', locale, platform, slot);
}

export function screenshotUrl(scene, locale) {
  return `foxiem://_dev/store/${scene}?lang=${encodeURIComponent(locale)}`;
}

export function screenshotWebUrl(origin, scene, locale) {
  const base = origin.replace(/\/$/, '');
  return `${base}/?scene=${encodeURIComponent(scene)}&lang=${encodeURIComponent(locale)}&os=ios#/_dev/store/${scene}?lang=${encodeURIComponent(locale)}`;
}

/** Logical viewports. Capture scale is 2× Apple's PNG so the downsample is 4K-class, then store size. */
export const WEB_IOS_VIEWPORTS = {
  'iphone-6.9': { width: 440, height: 956, deviceScaleFactor: 6, isMobile: true },
  'ipad-13': { width: 1032, height: 1376, deviceScaleFactor: 4, isMobile: false },
};

export const WEB_SCREENSHOT_PORT = process.env.STORE_SCREENSHOT_WEB_PORT || '8091';

export function androidSdk() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');
}

export function adbBin() {
  const sdk = androidSdk();
  const named = process.platform === 'win32' ? 'adb.exe' : 'adb';
  return path.join(sdk, 'platform-tools', named);
}

export function emulatorBin() {
  const named = process.platform === 'win32' ? 'emulator.exe' : 'emulator';
  return path.join(androidSdk(), 'emulator', named);
}

export function avdManagerBin() {
  const sdk = androidSdk();
  const bat = process.platform === 'win32' ? 'avdmanager.bat' : 'avdmanager';
  const candidates = [
    path.join(sdk, 'cmdline-tools', 'latest', 'bin', bat),
    path.join(sdk, 'cmdline-tools', 'bin', bat),
    path.join(sdk, 'tools', 'bin', bat),
  ];
  return candidates.find((file) => fs.existsSync(file)) ?? candidates[0];
}

export function pngInfo(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 29 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`${file} is not a PNG`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor(label, ms, check) {
  const deadline = Date.now() + ms;
  let last = '';
  while (Date.now() < deadline) {
    try {
      if (await check()) {
        return;
      }
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${last}` : ''}`);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function flattenPngToRgb(file) {
  const info = pngInfo(file);
  if (info.colorType !== 4 && info.colorType !== 6) {
    return info;
  }
  return writeStorePng(file, info.width, info.height);
}

/** Flatten alpha and bicubic-resample to exact store pixels (24-bit PNG, no alpha). */
export function writeStorePng(file, width, height) {
  if (process.platform !== 'win32') {
    throw new Error(`${file}: high-quality store PNG conversion is implemented for Windows`);
  }
  const script = `
Add-Type -AssemblyName System.Drawing
$path = '${file.replace(/'/g, "''")}'
$src = [System.Drawing.Bitmap]::FromFile($path)
$bmp = New-Object System.Drawing.Bitmap ${width}, ${height}, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($src, 0, 0, ${width}, ${height})
$src.Dispose()
$g.Dispose()
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/png' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [int64]100)
$bmp.Save($path + '.rgb.png', $codec, $ep)
$bmp.Dispose()
Move-Item -Force ($path + '.rgb.png') $path
`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Could not write store PNG: ${result.stderr || result.stdout}`);
  }
  return pngInfo(file);
}

export function screenshotEnv() {
  return {
    ...process.env,
    EXPO_PUBLIC_STORE_SCREENSHOTS: '1',
  };
}
