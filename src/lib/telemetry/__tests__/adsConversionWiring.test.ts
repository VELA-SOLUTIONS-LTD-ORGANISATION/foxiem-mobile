/** @jest-environment node */

import fs from 'fs';
import path from 'path';

const root = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('Ads conversion wiring', () => {
  it('logs onboarding_complete when setup completes', () => {
    const state = read('src/state/AppStateProvider.tsx');
    expect(state).toMatch(/logAdsConversion\('onboarding_complete'\)/);
  });

  it('logs first_count after the first increment', () => {
    const state = read('src/state/AppStateProvider.tsx');
    expect(state).toMatch(/logAdsConversion\('first_count'\)/);
    expect(state).toMatch(/hasLifetimeIncrement/);
  });

  it('keeps Ads conversions fail-open and lazy-loaded', () => {
    const ads = read('src/lib/telemetry/adsConversions.ts');
    expect(ads).toMatch(/onboarding_complete/);
    expect(ads).toMatch(/first_count/);
    expect(ads).toMatch(/not gated by/);
    expect(ads).toMatch(/NativeRNFBTurboApp/);
    expect(ads).toMatch(/TurboModuleRegistry/);
    expect(ads).not.toMatch(/@react-native-firebase\/analytics/);
  });
});
