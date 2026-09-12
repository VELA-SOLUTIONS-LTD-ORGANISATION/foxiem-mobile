import fs from 'node:fs';
import path from 'node:path';

import { FOXIEM_STORAGE_KEYS } from '@/storage/keys';

describe('release config', () => {
  it('keeps Foxiem identity and portrait orientation', () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'),
    ) as {
      expo: {
        name: string;
        orientation: string;
        ios?: { bundleIdentifier?: string };
        android?: { package?: string };
      };
    };
    expect(appJson.expo.name).toBe('Foxiem');
    expect(appJson.expo.orientation).toBe('portrait');
    expect(appJson.expo.ios?.bundleIdentifier).toBe('co.uk.solutionvela.foxiem');
    expect(appJson.expo.android?.package).toBe('co.uk.solutionvela.foxiem');
  });
});

describe('architecture regression guards', () => {
  const srcRoot = path.join(__dirname, '..');

  function readSrcFiles(): string[] {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') {
            continue;
          }
          walk(full);
          continue;
        }
        if (/\.(ts|tsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
    };
    walk(srcRoot);
    return files;
  }

  it('does not call AsyncStorage.clear for reset', () => {
    const resetFile = fs.readFileSync(path.join(srcRoot, 'storage', 'appStorage.ts'), 'utf8');
    expect(resetFile).toContain('multiRemove');
    expect(resetFile).not.toMatch(/AsyncStorage\.clear\(/);
    expect(FOXIEM_STORAGE_KEYS).toEqual([
      'foxiem.profile',
      'foxiem.preferences',
      'foxiem.counter',
      'foxiem.history',
      'foxiem.reminders',
      'foxiem.setupCompleted',
    ]);
  });

  it('configures AdMob plugin with App IDs and does not enable ATT tracking description', () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'app.json'), 'utf8'),
    ) as {
      expo: {
        plugins: Array<string | [string, Record<string, unknown>?]>;
      };
    };

    const admobPlugin = appJson.expo.plugins.find(
      (plugin) =>
        plugin === 'react-native-google-mobile-ads' ||
        (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads'),
    );
    expect(admobPlugin).toBeTruthy();
    expect(Array.isArray(admobPlugin)).toBe(true);
    if (Array.isArray(admobPlugin)) {
      const options = admobPlugin[1] as {
        androidAppId?: string;
        iosAppId?: string;
        userTrackingUsageDescription?: string;
      };
      expect(options.androidAppId).toBe('ca-app-pub-3249455013386377~1127078474');
      expect(options.iosAppId).toBe('ca-app-pub-3249455013386377~1517960718');
      expect(options.androidAppId).not.toMatch(/3940256099942544/);
      expect(options.iosAppId).not.toMatch(/3940256099942544/);
      expect(options.userTrackingUsageDescription).toBeUndefined();
    }

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };
    expect(packageJson.dependencies?.['react-native-google-mobile-ads']).toBeTruthy();
    expect(packageJson.dependencies?.['expo-tracking-transparency']).toBeUndefined();
  });

  it('does not introduce firebase/analytics SDKs or backend base URL', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    expect(
      Object.keys(deps).some((name) =>
        /firebase|@react-native-firebase|amplitude|sentry|segment/i.test(name),
      ),
    ).toBe(false);

    const joined = readSrcFiles()
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    expect(joined).not.toMatch(/https?:\/\/api\.foxiem/i);
    expect(joined).not.toMatch(/Delete Account/);
  });
});
