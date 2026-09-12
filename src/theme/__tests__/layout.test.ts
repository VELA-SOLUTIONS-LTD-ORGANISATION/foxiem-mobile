import { contentMaxWidth, getHorizontalPadding, getLayoutRange, layoutBreakpoints } from '@/theme/layout';
import { space } from '@/theme/spacing';

describe('responsive layout helpers', () => {
  it('classifies compact/standard/largePhone with exact boundaries', () => {
    expect(getLayoutRange(359)).toBe('compact');
    expect(getLayoutRange(360)).toBe('standard');
    expect(getLayoutRange(429)).toBe('standard');
    expect(getLayoutRange(430)).toBe('largePhone');
    expect(layoutBreakpoints.compactMax).toBe(360);
    expect(layoutBreakpoints.largePhoneMin).toBe(430);
  });

  it('selects horizontal padding tokens by width', () => {
    expect(getHorizontalPadding(320)).toBe(space[3]);
    expect(getHorizontalPadding(375)).toBe(space[4]);
    expect(getHorizontalPadding(430)).toBe(space[5]);
    expect(getHorizontalPadding(480)).toBe(space[5]);
  });

  it('keeps content max width constrained', () => {
    expect(contentMaxWidth).toBe(600);
  });
});
