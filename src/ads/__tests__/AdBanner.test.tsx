import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { AdBanner } from '@/ads/components/AdBanner';
import * as AdsProviderModule from '@/ads/AdsProvider';

jest.mock('@/ads/AdsProvider', () => {
  const actual = jest.requireActual('@/ads/AdsProvider');
  return {
    ...actual,
    useAds: jest.fn(),
  };
});

const useAds = AdsProviderModule.useAds as jest.Mock;

describe('AdBanner', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    jest.clearAllMocks();
  });

  it('renders nothing when ads are not ready', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    useAds.mockReturnValue({
      canRequestAds: true,
      adsReady: false,
      isBootstrapping: false,
      privacyOptionsRequired: false,
      openPrivacyOptions: jest.fn(),
    });

    const view = await render(<AdBanner placement="statistics" />);
    expect(view.toJSON()).toBeNull();
  });

  it('renders nothing when canRequestAds is false', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    useAds.mockReturnValue({
      canRequestAds: false,
      adsReady: true,
      isBootstrapping: false,
      privacyOptionsRequired: false,
      openPrivacyOptions: jest.fn(),
    });

    const view = await render(<AdBanner placement="statistics" />);
    expect(view.toJSON()).toBeNull();
  });

  it('renders nothing on web', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    useAds.mockReturnValue({
      canRequestAds: true,
      adsReady: true,
      isBootstrapping: false,
      privacyOptionsRequired: false,
      openPrivacyOptions: jest.fn(),
    });

    const view = await render(<AdBanner placement="statistics" />);
    expect(view.toJSON()).toBeNull();
  });

  it('renders BannerAd with TestIds unit when native and ready', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    useAds.mockReturnValue({
      canRequestAds: true,
      adsReady: true,
      isBootstrapping: false,
      privacyOptionsRequired: false,
      openPrivacyOptions: jest.fn(),
    });

    const view = await render(<AdBanner placement="statistics" />);
    expect(view.getByTestId('banner-ad-ca-app-pub-3940256099942544/6300978111')).toBeTruthy();
  });
});
