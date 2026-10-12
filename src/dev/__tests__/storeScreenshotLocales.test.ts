import { appLanguageToStoreLocale, resolveStoreScreenshotLocale, screenshotTrackerNames, storeLocaleToAppLanguage } from '../storeScreenshotLocales';

describe('store screenshot locales', () => {
  it('maps store listing locales onto app languages', () => {
    expect(storeLocaleToAppLanguage('tr-TR')).toBe('tr');
    expect(storeLocaleToAppLanguage('de')).toBe('de');
    expect(storeLocaleToAppLanguage('pt-BR')).toBe('en');
    expect(resolveStoreScreenshotLocale('it')).toBe('it-IT');
    expect(appLanguageToStoreLocale('en')).toBe('en-GB');
  });

  it('uses translated template names for the fixture trackers', () => {
    expect(screenshotTrackerNames('de')['tracker.store.water']).not.toBe(screenshotTrackerNames('en')['tracker.store.water']);
    expect(screenshotTrackerNames('en')['tracker.store.workout']).toBe('Workout');
  });
});
