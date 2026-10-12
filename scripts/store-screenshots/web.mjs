import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  IPAD_SIZE,
  IOS_SIZE,
  ROOT,
  SCENE_FILES,
  WEB_IOS_VIEWPORTS,
  WEB_SCREENSHOT_PORT,
  ensureDir,
  pngInfo,
  writeStorePng,
  rawDir,
  requestedClasses,
  requestedLocales,
  requestedScenes,
  screenshotEnv,
  screenshotWebUrl,
  sleep,
  waitFor,
} from './common.mjs';

const SIZE_BY_SLOT = {
  'iphone-6.9': IOS_SIZE,
  'ipad-13': IPAD_SIZE,
};

function startExpoWeb(port) {
  const env = screenshotEnv();
  env.CI = '1';
  env.BROWSER = 'none';
  env.EXPO_NO_TELEMETRY = '1';
  const child = spawn('npx', ['expo', 'start', '--web', '--port', String(port)], {
    cwd: ROOT,
    env,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

function stopProcess(child) {
  if (!child || child.killed) {
    return;
  }
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    throw new Error('Playwright is required for iOS-sized web captures. Run: npm install -D playwright && npx playwright install chromium');
  }
}

const SCENE_TESTIDS = {
  home: 'home-list',
  tracker: 'tracker-detail',
  insights: 'insights',
  reminders: 'notifications',
  widgets: 'widgets',
  paywall: 'paywall',
};

async function captureSlot(browser, origin, item, locales, scenes) {
  const viewport = WEB_IOS_VIEWPORTS[item.slot];
  const expected = SIZE_BY_SLOT[item.slot];
  if (!viewport || !expected) {
    throw new Error(`No web viewport for ${item.slot}`);
  }
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: true,
    colorScheme: 'light',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });
  const page = await context.newPage();
  for (const locale of locales) {
    const out = rawDir(locale, 'ios', item.slot);
    ensureDir(out);
    for (const scene of scenes) {
      const url = screenshotWebUrl(origin, scene, locale);
      console.log(`Capturing web ios/${item.slot} ${locale} ${scene}`);
      await page.goto('about:blank');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.waitForFunction(
        (expected) => document.documentElement.dataset.storeScene === expected,
        scene,
        { timeout: 120_000 },
      );
      const testId = SCENE_TESTIDS[scene];
      if (testId) {
        await page.waitForSelector(`[data-testid="${testId}"]`, { timeout: 60_000 });
      }
      if (scene === 'paywall') {
        await page.waitForSelector('[data-testid="plan-yearly"]', { timeout: 60_000 });
        const failed = await page.locator('text=Couldn\'t load plans').count();
        if (failed) {
          throw new Error('Paywall showed a store load error');
        }
      }
      await sleep(scene === 'paywall' || scene === 'home' ? 2500 : 1500);
      const file = path.join(out, SCENE_FILES[scene]);
      await page.screenshot({ path: file, type: 'png', animations: 'disabled', caret: 'hide', scale: 'device' });
      writeStorePng(file, expected.width, expected.height);
      const info = pngInfo(file);
      if (info.width !== expected.width || info.height !== expected.height) {
        throw new Error(`${file} is ${info.width}x${info.height} (expected ${expected.width}x${expected.height})`);
      }
    }
    if (item.slot === 'iphone-6.9' && locale === 'en-GB' && scenes.includes('paywall')) {
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
  await context.close();
}

async function main() {
  const classes = requestedClasses().filter((item) => item.platform === 'ios' && item.enabled !== false && SIZE_BY_SLOT[item.slot]);
  if (!classes.length) {
    console.log('No enabled iOS screenshot classes.');
    return;
  }
  const locales = requestedLocales();
  const scenes = requestedScenes();
  const port = WEB_SCREENSHOT_PORT;
  const origin = `http://127.0.0.1:${port}`;
  const { chromium } = await loadPlaywright();
  const expo = startExpoWeb(port);
  let browser;
  try {
    await waitFor(`Expo web on ${origin}`, 180_000, async () => {
      const response = await fetch(origin, { redirect: 'manual' });
      return response.ok || response.status === 200;
    });
    browser = await chromium.launch({
      headless: true,
      args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'],
    });
    for (const item of classes) {
      await captureSlot(browser, origin, item, locales, scenes);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    stopProcess(expo);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
