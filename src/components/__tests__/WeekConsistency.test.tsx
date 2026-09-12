import { render } from '@testing-library/react-native';

import { WeekConsistency } from '@/components/display/WeekConsistency';

describe('WeekConsistency responsive structure', () => {
  it('always renders seven weekday columns', async () => {
    const view = await render(
      <WeekConsistency
        days={[
          { key: '1', label: 'M', state: 'active', accessibilityLabel: 'Mon active' },
          { key: '2', label: 'T', state: 'inactivePast', accessibilityLabel: 'Tue missed' },
          { key: '3', label: 'W', state: 'todayPending', accessibilityLabel: 'Wed pending' },
          { key: '4', label: 'T', state: 'future', accessibilityLabel: 'Thu future' },
          { key: '5', label: 'F', state: 'future', accessibilityLabel: 'Fri future' },
          { key: '6', label: 'S', state: 'future', accessibilityLabel: 'Sat future' },
          { key: '7', label: 'S', state: 'future', accessibilityLabel: 'Sun future' },
        ]}
      />,
    );

    expect(view.getAllByLabelText(/active|missed|pending|future/i)).toHaveLength(7);
  });
});
