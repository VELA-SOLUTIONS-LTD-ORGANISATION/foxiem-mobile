import fs from 'node:fs';
import path from 'node:path';

describe('AdMob placement contracts', () => {
  const root = path.join(__dirname, '..', '..');

  function read(rel: string) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  }

  it('Home / Privacy / Reminder screens do not render AdBanner', () => {
    expect(read('screens/home/HomeScreen.tsx')).not.toContain('AdBanner');
    expect(read('screens/settings/PrivacySecurityScreen.tsx')).not.toContain('AdBanner');
    expect(read('screens/reminders/RemindersScreen.tsx')).not.toContain('AdBanner');
    expect(read('screens/reminders/ReminderEditorScreen.tsx')).not.toContain('AdBanner');
    expect(read('screens/profile/ProfileScreen.tsx')).not.toContain('AdBanner');
    expect(read('screens/profile/EditProfileScreen.tsx')).not.toContain('AdBanner');
    expect(read('screens/statistics/ConsistencyScreen.tsx')).not.toContain('AdBanner');
  });

  it('Statistics and Activity History contain approved AdBanner placements', () => {
    expect(read('screens/statistics/StatisticsScreen.tsx')).toContain(
      'AdBanner placement="statistics"',
    );
    expect(read('screens/statistics/ActivityHistoryScreen.tsx')).toContain(
      'AdBanner placement="activityHistory"',
    );
    expect(read('screens/statistics/ActivityHistoryScreen.tsx')).toContain('ListFooterComponent');
  });

  it('screen files never hardcode ca-app-pub ad unit IDs', () => {
    const screensRoot = path.join(root, 'screens');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return walk(full);
        }
        return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
      });

    for (const file of walk(screensRoot)) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/ca-app-pub-\d+/);
    }
  });

  it('development banner selection is centralized on official Google test banner ID', () => {
    const config = read('ads/adConfig.ts');
    expect(config).toContain('GOOGLE_TEST_BANNER_UNIT_ID');
    expect(config).toContain('ca-app-pub-3940256099942544/6300978111');
    expect(config).toContain('isDev');
    expect(config).not.toContain("from 'react-native-google-mobile-ads'");
  });

  it('does not implement interstitial / app-open / rewarded ads', () => {
    const adsRoot = path.join(root, 'ads');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__') {
            return [];
          }
          return walk(full);
        }
        return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
      });

    const joined = walk(adsRoot)
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');

    expect(joined).not.toMatch(/InterstitialAd|AppOpenAd|RewardedAd|RewardedInterstitialAd/);
  });
});

describe('privacy advertising copy contracts', () => {
  const privacy = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'settings', 'PrivacySecurityScreen.tsx'),
    'utf8',
  );

  it('Privacy mentions advertising and conditional privacy choices', () => {
    expect(privacy).toContain('privacy.advertising.title');
    expect(privacy).toContain('privacy.advertising.body');
    expect(privacy).toContain('privacy.adChoices');
    expect(privacy).toContain('privacyOptionsRequired');
    expect(privacy).toContain('openPrivacyOptions');
    expect(privacy).not.toContain('AdBanner');
    expect(privacy).not.toContain('requestNotificationPermission');
  });
});
