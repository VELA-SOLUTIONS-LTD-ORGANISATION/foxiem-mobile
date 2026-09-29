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
    expect(Object.keys(deps).some((name) => /amplitude|segment|mixpanel/i.test(name))).toBe(false);
    const androidConfig = JSON.parse(fs.readFileSync(path.join(root, 'google-services.json'), 'utf8')) as {
      project_info?: { project_id?: string };
    };
    expect(androidConfig.project_info?.project_id).toBe('foxiem-counter');
    const appConfig = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');
    expect(appConfig).toContain('@react-native-firebase/analytics');
    expect(appConfig).toContain('android:resizeableActivity');
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

  it('has no backend, account UI or fake sync', () => {
    expect(joined).not.toMatch(/https?:\/\/api\./i);
    expect(joined).not.toMatch(/sign ?in|log ?in|create account|delete account/i);
    const types = fs.readFileSync(path.join(srcRoot, 'navigation', 'types.ts'), 'utf8');
    for (const route of ['SignIn', 'SignUp', 'Login', 'Account', 'Profile', 'Marketplace']) {
      expect(types).not.toContain(`${route}:`);
    }
  });

  it('production builds never simulate purchases', () => {
    const adapter = fs.readFileSync(path.join(srcRoot, 'pro', 'purchaseAdapter.ts'), 'utf8');
    expect(adapter).toMatch(/if \(__DEV__\) \{\s*return createSimulatedAdapter/);
    expect(adapter).toMatch(/return unavailableAdapter;\s*\}\s*$/);
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
