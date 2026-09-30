import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..', '..');
const srcRoot = path.join(__dirname, '..');

type AppJson = {
  expo: {
    name: string;
    orientation: string;
    userInterfaceStyle?: string;
    ios?: { bundleIdentifier?: string; infoPlist?: Record<string, unknown> };
    android?: { package?: string; permissions?: string[] };
    plugins: (string | [string, Record<string, unknown>?])[];
  };
};

function readAppJson(): AppJson {
  return JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')) as AppJson;
}

function readPackage(): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

function readSrcFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') {
          walk(full);
        }
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        files.push(full);
      }
    }
  };
  walk(srcRoot);
  return files;
}

describe('release config', () => {
  it('keeps Foxiem identity, portrait orientation and system light/dark', () => {
    const { expo } = readAppJson();
    expect(expo.name).toBe('Foxiem');
    expect(expo.orientation).toBe('portrait');
    expect(expo.userInterfaceStyle).toBe('automatic');
    expect(expo.ios?.bundleIdentifier).toBe('co.uk.solutionvela.foxiem');
    expect(expo.android?.package).toBe('co.uk.solutionvela.foxiem');
  });

  it('ships without an advertising SDK or tracking prompt', () => {
    const { expo } = readAppJson();
    const pluginNames = expo.plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
    expect(pluginNames).not.toContain('react-native-google-mobile-ads');
    const deps = { ...readPackage().dependencies, ...readPackage().devDependencies };
    expect(deps['react-native-google-mobile-ads']).toBeUndefined();
    expect(deps['expo-tracking-transparency']).toBeUndefined();
    expect(expo.ios?.infoPlist?.NSUserTrackingUsageDescription).toBeUndefined();
  });

  it('keeps Firebase Analytics wiring for the Foxiem project only', () => {
    const deps = readPackage().dependencies ?? {};
    expect(deps['@react-native-firebase/app']).toBeTruthy();
    expect(deps['@react-native-firebase/analytics']).toBeTruthy();
    expect(deps['@sentry/react-native']).toBeTruthy();
    expect(Object.keys(deps).some((name) => /amplitude|segment|mixpanel/i.test(name))).toBe(false);
    const androidConfig = JSON.parse(fs.readFileSync(path.join(root, 'google-services.json'), 'utf8')) as {
      project_info?: { project_id?: string };
    };
    expect(androidConfig.project_info?.project_id).toBe('foxiem-counter');
    const appConfig = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');
    expect(appConfig).toContain('@react-native-firebase/analytics');
    expect(appConfig).toContain('@sentry/react-native/expo');
    expect(appConfig).toContain('foxiem-mobile');
    expect(appConfig).toContain('android:resizeableActivity');
    const sentry = fs.readFileSync(path.join(srcRoot, 'lib', 'telemetry', 'sentry.ts'), 'utf8');
    expect(sentry).toContain('EXPO_PUBLIC_SENTRY_DSN');
    expect(sentry).toContain('sendDefaultPii: false');
  });
});

describe('architecture regression guards', () => {
  const joined = readSrcFiles()
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  it('never wipes storage it does not own', () => {
    const storage = fs.readFileSync(path.join(srcRoot, 'storage', 'appStorage.ts'), 'utf8');
    expect(storage).toContain('multiRemove');
    expect(storage).toContain('FOXIEM_KEY_PREFIX');
    expect(joined).not.toMatch(/AsyncStorage\.clear\(/);
  });

  it('keeps the optional account confined, configuration-gated and password-free', () => {
    // The backend address comes from the build environment, never from source.
    expect(joined).not.toMatch(/https?:\/\/api\./i);
    // Google only: no passwords, no sign-up form.
    expect(joined).not.toMatch(/create account|sign ?up|password/i);
    const types = fs.readFileSync(path.join(srcRoot, 'navigation', 'types.ts'), 'utf8');
    for (const route of ['SignIn', 'SignUp', 'Login', 'Account', 'Profile', 'Marketplace']) {
      expect(types).not.toContain(`${route}:`);
    }
    // Only src/account talks to the network; everything else works offline.
    for (const file of readSrcFiles()) {
      if (path.relative(srcRoot, file).startsWith('account')) {
        continue;
      }
      expect({ file: path.relative(srcRoot, file), network: /(^|[^.\w])fetch\(|XMLHttpRequest|WebSocket\(/.test(fs.readFileSync(file, 'utf8')) }).toEqual({
        file: path.relative(srcRoot, file),
        network: false,
      });
    }
    // With no backend configured, the account surfaces do not render at all.
    const settings = fs.readFileSync(path.join(srcRoot, 'screens', 'settings', 'SettingsScreen.tsx'), 'utf8');
    expect(settings).toContain('account.available ?');
    const config = fs.readFileSync(path.join(srcRoot, 'account', 'config.ts'), 'utf8');
    expect(config).toContain('process.env.EXPO_PUBLIC_API_URL');
    expect(config).toContain('available: false');
  });

  it('production builds never simulate purchases', () => {
    const adapter = fs.readFileSync(path.join(srcRoot, 'pro', 'purchaseAdapter.ts'), 'utf8');
    // The simulator is only ever required inside a `__DEV__` branch, and a build without a
    // valid store key ends in `unavailableAdapter`, never in the simulator.
    expect(adapter).toMatch(/if \(__DEV__ && !storeEnabledInDevelopment\(\)\) \{[\s\S]*?require\('@\/dev\/simulatedAdapter'\)/);
    expect(adapter.match(/simulatedAdapter/g)?.length).toBeLessThanOrEqual(3);
    expect(adapter).toMatch(/return unavailableAdapter;\s*\}\s*const sdk/);
    expect(adapter).toMatch(/return createRevenueCatAdapter\(/);
  });

  it('only imports development helpers as types or behind __DEV__', () => {
    for (const file of readSrcFiles()) {
      const relative = path.relative(srcRoot, file);
      if (relative.startsWith('dev') || relative.endsWith('purchaseAdapter.ts')) {
        continue;
      }
      const source = fs.readFileSync(file, 'utf8');
      for (const line of source.split('\n')) {
        if (/from '@\/dev\//.test(line) && !/^import type /.test(line.trim())) {
          // A runtime import of src/dev is only acceptable from a file that is itself dev-gated.
          expect({ file: relative, gated: /__DEV__/.test(source) }).toEqual({ file: relative, gated: true });
        }
      }
    }
  });

  it('ships store billing: RevenueCat SDK, entitlement id and the three product ids', () => {
    const deps = readPackage().dependencies ?? {};
    expect(deps['react-native-purchases']).toBeTruthy();
    const config = fs.readFileSync(path.join(srcRoot, 'pro', 'config.ts'), 'utf8');
    for (const id of ['foxiem_pro_monthly', 'foxiem_pro_yearly', 'foxiem_pro_lifetime']) {
      expect(config).toContain(id);
    }
    expect(config).not.toMatch(/plan: 'weekly'|foxiem_pro_weekly/);
    const mapping = fs.readFileSync(path.join(srcRoot, 'pro', 'customerInfoMapping.ts'), 'utf8');
    expect(mapping).toContain("PRO_ENTITLEMENT_ID = 'pro'");
  });

  it('keeps Pro gating in one registry', () => {
    const screens = readSrcFiles().filter((file) => file.includes(`${path.sep}screens${path.sep}`));
    for (const file of screens) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/entitlement\.status\s*===\s*'active'\s*&&\s*canUse/);
      expect(source).not.toMatch(/hasProAccess\(/);
    }
  });
});
