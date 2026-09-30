import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import '@/i18n';
import { at, makeEvents, makeTracker } from '@/domain/__tests__/helpers';
import { ThemeProvider } from '@/theme';

import { MonthCalendar, CELL_HIT_HEIGHT } from '../MonthCalendar';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

describe('MonthCalendar touch targets', () => {
  it('gives every selectable day a full-height, full-column hit area that tiles without overlap', async () => {
    const tracker = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8 });
    const events = makeEvents(tracker, [[at(2026, 9, 3), 4]]);
    await render(
      <ThemeProvider>
        <MonthCalendar
          tracker={tracker}
          events={events}
          month={at(2026, 9, 1)}
          context={{ now: at(2026, 9, 20), weekStart: 1 }}
          locale="en"
          selectedKey={null}
          onSelect={jest.fn()}
          onPrevious={null}
          onNext={null}
        />
      </ThemeProvider>,
    );

    const days = screen.getAllByRole('button').filter((node) => /September/.test(String(node.props.accessibilityLabel)));
    expect(days.length).toBe(30);

    for (const day of days) {
      const style = StyleSheet.flatten(day.props.style);
      // Height is fixed at the minimum target; width is the column (flex: 1), so neighbours share edges
      // exactly: no margins, gaps or negative offsets that could make two targets overlap.
      expect(style.height).toBe(CELL_HIT_HEIGHT);
      expect(style.flex).toBe(1);
      expect(style.margin ?? 0).toBe(0);
      expect(style.marginHorizontal ?? 0).toBe(0);
      expect(style.marginVertical ?? 0).toBe(0);
      expect(day.props.hitSlop).toBeUndefined();
    }
    expect(CELL_HIT_HEIGHT).toBeGreaterThanOrEqual(44);
  });
});
