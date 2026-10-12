import { claimScreenshotUrl, screenshotUrlAlreadyClaimed } from '../storeScreenshotLaunch';

describe('store screenshot launch URL', () => {
  it('handles a VIEW intent only once', () => {
    const url = `foxiem://_dev/store/home?lang=en-GB&once=${Date.now()}`;
    expect(claimScreenshotUrl(url)).toBe(true);
    expect(claimScreenshotUrl(url)).toBe(false);
    expect(screenshotUrlAlreadyClaimed(url)).toBe(true);
    expect(claimScreenshotUrl('foxiem://_dev/store/tracker?lang=en-GB')).toBe(true);
  });
});
