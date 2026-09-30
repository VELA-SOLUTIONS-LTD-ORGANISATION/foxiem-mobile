import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text as NativeText } from 'react-native';

import '@/i18n';
import { ThemeProvider } from '@/theme';

import { ConfirmDialog } from '../ConfirmDialog';
import { shouldDismissSheet } from '../overlayMotion';
import { Sheet } from '../Sheet';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

function wrap(node: ReactElement) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

function sheet(visible: boolean, onClose: () => void = jest.fn()) {
  return wrap(
    <Sheet visible={visible} title="Pick" onClose={onClose}>
      <NativeText>Body</NativeText>
    </Sheet>,
  );
}

describe('sheet drag dismissal', () => {
  it('dismisses on a long drag or a quick flick, not on a small nudge', () => {
    expect(shouldDismissSheet(140, 0)).toBe(true);
    expect(shouldDismissSheet(40, 1.4)).toBe(true);
    expect(shouldDismissSheet(30, 0.2)).toBe(false);
    expect(shouldDismissSheet(8, 2)).toBe(false);
  });
});

describe('Sheet', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('closes once however many times the close control is pressed', async () => {
    const onClose = jest.fn();
    await render(sheet(true, onClose));
    expect(screen.getByText('Body')).toBeTruthy();
    const close = screen.getAllByRole('button').find((node) => node.props.accessibilityLabel === 'Close');
    expect(close).toBeTruthy();
    await fireEvent.press(close!);
    await fireEvent.press(close!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays mounted for its exit animation, then unmounts, and reopens cleanly', async () => {
    const view = await render(sheet(true));
    await view.rerender(sheet(false));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Body')).toBeNull();

    await view.rerender(sheet(true));
    expect(screen.getByText('Body')).toBeTruthy();
  });
});

describe('ConfirmDialog', () => {
  it('cannot confirm twice while the action is running', async () => {
    let finish: () => void = () => undefined;
    const onConfirm = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    await render(wrap(<ConfirmDialog visible title="Reset?" confirmLabel="Reset" onConfirm={onConfirm} onCancel={jest.fn()} />));
    const confirm = screen.getByText('Reset');
    await fireEvent.press(confirm);
    await fireEvent.press(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
    });
  });
});
