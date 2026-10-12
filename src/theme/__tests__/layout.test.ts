import { contentMaxWidth, getContentMaxWidth, getHorizontalPadding, getLayoutRange, layoutBreakpoints, tabletContentMaxWidth } from '@/theme/layout';
import { space } from '@/theme/spacing';

describe('responsive layout helpers', () => {
  it('classifies compact/standard/largePhone/tablet with exact boundaries', () => {
    expect(getLayoutRange(359)).toBe('compact');
    expect(getLayoutRange(360)).toBe('standard');
    expect(getLayoutRange(429)).toBe('standard');
    expect(getLayoutRange(430)).toBe('largePhone');
    expect(getLayoutRange(767)).toBe('largePhone');
    expect(getLayoutRange(768)).toBe('tablet');
    expect(layoutBreakpoints.compactMax).toBe(360);
    expect(layoutBreakpoints.largePhoneMin).toBe(430);
    expect(layoutBreakpoints.tabletMin).toBe(768);
  });

  it('selects horizontal padding tokens by width', () => {
    expect(getHorizontalPadding(320)).toBe(space[3]);
    expect(getHorizontalPadding(375)).toBe(space[4]);
    expect(getHorizontalPadding(430)).toBe(space[5]);
    expect(getHorizontalPadding(480)).toBe(space[5]);
    expect(getHorizontalPadding(1024)).toBe(space[8]);
  });

  it('keeps phone content capped and widens tablets', () => {
    expect(contentMaxWidth).toBe(560);
    expect(getContentMaxWidth(430)).toBe(560);
    expect(getContentMaxWidth(1024)).toBe(tabletContentMaxWidth);
    expect(tabletContentMaxWidth).toBe(840);
  });
});
