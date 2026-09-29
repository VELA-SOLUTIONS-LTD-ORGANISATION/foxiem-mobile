import 'react-native-gesture-handler/jestSetup';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import App from '../../App';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));

jest.setTimeout(30_000);

async function launch() {
  const view = await render(<App />);
  return view;
}

async function press(label: string | RegExp) {
  const target = await screen.findByText(label);
  await act(() => {
    fireEvent.press(target);
  });
}

async function pressLabel(label: string | RegExp) {
  const target = await screen.findByLabelText(label);
  await act(() => {
    fireEvent.press(target);
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Foxiem flows', () => {
  it('new user: welcome, pick a template, create it and count with Undo', async () => {
    await launch();
    expect(await screen.findByText('Count what matters.')).toBeTruthy();

    await press('Start counting');
    expect(await screen.findByText('Start with something useful')).toBeTruthy();

    await press('Coffee');
    await press('Create tracker');

    expect(await screen.findByText('3 left within today\'s limit')).toBeTruthy();

    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const add = await screen.findByLabelText('Add 1');
    await act(() => {
      fireEvent.press(add);
    });
    await act(() => {
      fireEvent.press(add);
    });
    expect(await screen.findByText('1 left within today\'s limit')).toBeTruthy();
    expect(announce).toHaveBeenLastCalledWith('Coffee: 2');

    await press('Undo');
    expect(await screen.findByText('3 left within today\'s limit')).toBeTruthy();

    await act(() => {
      fireEvent.press(add);
      fireEvent.press(add);
      fireEvent.press(add);
      fireEvent.press(add);
    });
    expect(await screen.findByText('1 over today\'s limit')).toBeTruthy();
  });

  it('repeat user: the tracker is still there after a restart and counts from Home', async () => {
    const first = await launch();
    await press('Start counting');
    await press('Water');
    await press('Create tracker');
    await pressLabel('Add 1');
    await waitFor(() => expect(screen.getByText('7 to go today')).toBeTruthy());
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    await first.unmount();

    await launch();
    expect(await screen.findByLabelText('Water, 1 of 8, 7 to go today')).toBeTruthy();
    expect(screen.queryByText('Count what matters.')).toBeNull();

    await pressLabel('Add 1 to Water');
    expect(await screen.findByLabelText('Water, 2 of 8, 6 to go today')).toBeTruthy();

    await pressLabel('Undo +1 Water');
    expect(await screen.findByLabelText('Water, 1 of 8, 7 to go today')).toBeTruthy();
  });

  it('Pro paywall is dismissible and returns to where the user was', async () => {
    await launch();
    await press('Start counting');
    await press('Ideas');
    await press('Create tracker');
    await pressLabel('Back');

    await pressLabel(/^Settings, tab/);
    expect(await screen.findByText('Preferences')).toBeTruthy();
    const proRow = await screen.findByTestId('settings-pro');
    await act(() => {
      fireEvent.press(proRow);
    });
    expect(await screen.findByText('Development build: purchases are simulated and nothing is charged.')).toBeTruthy();

    await pressLabel('Close');
    await waitFor(() => expect(screen.queryByTestId('paywall-close')).toBeNull());
    expect(screen.getByText('Preferences')).toBeTruthy();
    expect(screen.getByTestId('settings-pro')).toBeTruthy();
  });

  it('existing 1.x user: counters arrive as trackers with their counts, no onboarding', async () => {
    await AsyncStorage.multiSet([
      [
        'foxiem.counterDomain',
        JSON.stringify({
          schemaVersion: 2,
          activeTopicId: 'topic.water',
          topics: [
            { id: 'topic.default', kind: 'default', currentCount: 47, createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'topic.water', kind: 'custom', name: 'Water', currentCount: 6, createdAt: '2026-01-02T00:00:00.000Z' },
          ],
          events: [
            { id: 'w1', topicId: 'topic.water', type: 'increment', amount: 6, previousValue: 0, newValue: 6, createdAt: '2026-01-14T10:00:00.000Z' },
          ],
        }),
      ],
      ['foxiem.topicMigrationVersion', '1'],
      ['foxiem.setupCompleted', 'true'],
      ['foxiem.profile', JSON.stringify({ name: 'Ada' })],
    ]);

    await launch();
    expect(await screen.findByLabelText(/^Water, 6 total/)).toBeTruthy();
    expect(screen.getByLabelText(/^General, 47 total/)).toBeTruthy();
    expect(screen.getByText('Foxiem now counts with intent')).toBeTruthy();
    expect(screen.queryByText('Count what matters.')).toBeNull();
    // The 1.x data stays in place as a backup.
    await expect(AsyncStorage.getItem('foxiem.counterDomain')).resolves.not.toBeNull();
  });

  it('reminder with notifications blocked: explains it and offers Open Settings', async () => {
    const Notifications = jest.requireMock('expo-notifications') as { getPermissionsAsync: jest.Mock };
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false });
    try {
      await launch();
      await press('Start counting');
      await press('Water');
      await press('Create tracker');
      await pressLabel('Tracker settings');
      await press('Add reminder');
      expect(await screen.findByText('Notifications are off for Foxiem')).toBeTruthy();
      expect(screen.getByText('Open Settings')).toBeTruthy();
    } finally {
      Notifications.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true });
    }
  });

  it('Reset Foxiem asks first, removes only Foxiem data and returns to Welcome', async () => {
    await AsyncStorage.setItem('other.library.key', 'untouched');
    await launch();
    await press('Start counting');
    await press('Ideas');
    await press('Create tracker');
    await pressLabel('Back');
    await pressLabel(/^Settings, tab/);

    await press('Reset Foxiem');
    expect(await screen.findByText('Reset Foxiem?')).toBeTruthy();
    await press('Reset everything');

    expect(await screen.findByText('Count what matters.')).toBeTruthy();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((key) => key.startsWith('foxiem.'))).toEqual([]);
    expect(keys).toContain('other.library.key');
  });
});
