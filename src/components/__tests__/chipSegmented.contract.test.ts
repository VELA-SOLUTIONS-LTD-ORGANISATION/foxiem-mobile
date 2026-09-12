import fs from 'node:fs';
import path from 'node:path';

describe('Chip and SegmentedControl contracts', () => {
  const chip = fs.readFileSync(path.join(__dirname, '..', 'display', 'Chip.tsx'), 'utf8');
  const segmented = fs.readFileSync(
    path.join(__dirname, '..', 'display', 'SegmentedControl.tsx'),
    'utf8',
  );

  it('Chip exposes selected/disabled accessibility state and press handler', () => {
    expect(chip).toContain('accessibilityState={{ selected, disabled }}');
    expect(chip).toContain('accessibilityLabel={label}');
    expect(chip).toContain('onPress={onPress}');
  });

  it('SegmentedControl keeps tab semantics and selected state', () => {
    expect(segmented).toContain('accessibilityRole="tablist"');
    expect(segmented).toContain('accessibilityRole="tab"');
    expect(segmented).toContain('accessibilityState={{ selected }}');
    expect(segmented).toContain('numberOfLines={2}');
  });
});
