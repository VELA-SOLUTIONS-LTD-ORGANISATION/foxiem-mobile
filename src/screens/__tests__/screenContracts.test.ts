import fs from 'node:fs';
import path from 'node:path';

describe('navigation and screen contracts', () => {
  const root = path.join(__dirname, '..', '..');

  it('Profile menu source excludes Delete Account / marketplace leftovers', () => {
    const profile = fs.readFileSync(path.join(root, 'screens', 'profile', 'ProfileScreen.tsx'), 'utf8');
    expect(profile).toContain("navigate('EditProfile')");
    expect(profile).toContain("navigate('Reminders')");
    expect(profile).toContain("navigate('Language')");
    expect(profile).toContain("navigate('PrivacySecurity')");
    expect(profile).toContain("navigate('About')");
    expect(profile).not.toContain('Delete Account');
    expect(profile).not.toContain('PaymentSettings');
  });

  it('production route types exclude auth, marketplace, and demo screens', () => {
    const types = fs.readFileSync(path.join(root, 'navigation', 'types.ts'), 'utf8');
    const banned = [
      'Marketplace',
      'SignIn',
      'SignUp',
      'Login',
      'DeleteAccount',
      'DevExplorer',
      'DesignSystem',
      'NavigationExplorer',
      'Notifications',
      'Orders',
      'Messages',
      'Checkout',
      'Favourites',
      'Wallet',
      'MyListings',
      'Welcome',
      'Onboarding',
    ];
    for (const route of banned) {
      expect(types).not.toContain(`${route}:`);
    }

    expect(types).toContain('Splash:');
    expect(types).toContain('ProfileSetup:');
    expect(types).toContain('Main:');
    expect(types).toContain('HomeTab:');
    expect(types).toContain('StatisticsTab:');
    expect(types).toContain('ProfileTab:');
    expect(types).toContain('ActivityHistory:');
    expect(types).toContain('Consistency:');
    expect(types).toContain('EditProfile:');
    expect(types).toContain('Reminders:');
    expect(types).toContain('AddReminder:');
    expect(types).toContain('EditReminder:');
    expect(types).toContain('Language:');
    expect(types).toContain('PrivacySecurity:');
    expect(types).toContain('About:');
  });

  it('RootNavigator and MainNavigator only register production screens', () => {
    const rootNav = fs.readFileSync(path.join(root, 'navigation', 'RootNavigator.tsx'), 'utf8');
    const mainNav = fs.readFileSync(path.join(root, 'navigation', 'MainNavigator.tsx'), 'utf8');
    expect(rootNav).not.toContain('DevExplorer');
    expect(rootNav).not.toContain('DesignSystem');
    expect(mainNav).not.toContain('PlaceholderScreen');
    expect(mainNav).not.toContain('Marketplace');
    expect(mainNav).toContain('name="ActivityHistory"');
    expect(mainNav).toContain('name="Reminders"');
    expect(mainNav).toContain('name="About"');
  });

  it('Privacy screen does not request notification permission on open', () => {
    const privacy = fs.readFileSync(
      path.join(root, 'screens', 'settings', 'PrivacySecurityScreen.tsx'),
      'utf8',
    );
    expect(privacy).toContain('getNotificationPermissionState');
    expect(privacy).not.toContain('requestNotificationPermission');
    expect(privacy).toContain('privacy.advertising');
    expect(privacy).toContain('privacyOptionsRequired');
  });

  it('Language screen lists six supported languages', () => {
    const languages = fs.readFileSync(path.join(root, 'i18n', 'languages.ts'), 'utf8');
    expect(languages).toContain("'en'");
    expect(languages).toContain("'tr'");
    expect(languages).toContain("'de'");
    expect(languages).toContain("'fr'");
    expect(languages).toContain("'es'");
    expect(languages).toContain("'it'");
  });
});
