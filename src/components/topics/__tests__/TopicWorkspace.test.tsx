import { fireEvent, render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TopicWorkspace } from '@/components/topics/TopicWorkspace';
import { i18n } from '@/i18n';
import { useAppState } from '@/state';
import { createCustomTopic, createDefaultTopic } from '@/state/topics';

jest.mock('@/components/topics/TopicPickerSheet', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    TopicPickerSheet: ({
      visible,
      topics,
      onSelect,
      onRename,
      onRequestClose,
    }: {
      visible: boolean;
      topics: { id: string; name?: string; kind: string }[];
      onSelect: (topicId: string) => void;
      onRename: (topicId: string, name: string) => void;
      onRequestClose: () => void;
    }) =>
      visible
        ? React.createElement(
            View,
            { testID: 'topic-picker-sheet' },
            topics.map((topic) =>
              React.createElement(
                Pressable,
                {
                  key: topic.id,
                  accessibilityRole: 'button',
                  accessibilityLabel: topic.name ?? 'General',
                  onPress: () => onSelect(topic.id),
                },
                React.createElement(Text, null, topic.name ?? 'General'),
              ),
            ),
            React.createElement(
              Pressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: 'Rename Water',
                onPress: () => onRename('topic.water', 'Water'),
              },
              React.createElement(Text, null, 'Rename Water'),
            ),
            React.createElement(
              Pressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: 'Close sheet',
                onPress: onRequestClose,
              },
              React.createElement(Text, null, 'Close sheet'),
            ),
          )
        : null,
  };
});

jest.mock('@/components/topics/TopicNameEditor', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    TopicNameEditor: ({
      visible,
      mode,
      value,
      onChangeText,
      onSubmit,
      onClose,
    }: {
      visible: boolean;
      mode: 'create' | 'rename';
      value: string;
      onChangeText: (value: string) => void;
      onSubmit: () => string | null;
      onClose: () => void;
    }) =>
      visible
        ? React.createElement(
            View,
            { testID: 'topic-name-editor' },
            React.createElement(Text, null, mode === 'rename' ? 'Rename topic' : 'New topic'),
            React.createElement(TextInput, {
              accessibilityLabel: 'Topic name',
              value,
              onChangeText,
            }),
            React.createElement(
              Pressable,
              { accessibilityRole: 'button', onPress: onClose },
              React.createElement(Text, null, 'Cancel'),
            ),
            React.createElement(
              Pressable,
              { accessibilityRole: 'button', onPress: () => onSubmit() },
              React.createElement(Text, null, mode === 'rename' ? 'Save' : 'Create'),
            ),
          )
        : null,
  };
});

jest.mock('@/components/feedback/Toast', () => ({
  ToastProvider: ({ children }: { children: unknown }) => children,
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/state', () => ({
  useAppState: jest.fn(),
}));

const useAppStateMock = useAppState as jest.MockedFunction<typeof useAppState>;

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function baseState(overrides?: Partial<ReturnType<typeof useAppState>>) {
  const general = createDefaultTopic(47, '2026-09-01T00:00:00.000Z');
  const water = { ...createCustomTopic('Water', '2026-09-02T00:00:00.000Z', 'topic.water'), currentCount: 12 };
  return {
    topics: [general, water],
    activeTopic: general,
    activeTopicId: general.id,
    selectTopic: jest.fn(),
    createTopic: jest.fn().mockReturnValue({ topic: null, error: null }),
    renameTopic: jest.fn().mockReturnValue({ topic: water, error: null }),
    ...overrides,
  } as ReturnType<typeof useAppState>;
}

function renderWorkspace(variant: 'home' | 'compact' = 'home') {
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <I18nextProvider i18n={i18n}>
        <TopicWorkspace variant={variant} />
      </I18nextProvider>
    </SafeAreaProvider>,
  );
}

function overlayType(view: Awaited<ReturnType<typeof renderWorkspace>>) {
  return view.getByTestId(/topic-workspace-/).props.accessibilityValue?.text;
}

describe('TopicWorkspace interactions', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useAppStateMock.mockReturnValue(baseState());
  });

  it('opens and closes the picker repeatedly without locking', async () => {
    const view = await renderWorkspace();

    for (let cycle = 0; cycle < 10; cycle += 1) {
      await fireEvent.press(view.getByTestId('home-topic-selector'));
      expect(overlayType(view)).toBe('picker');
      expect(view.getByTestId('topic-picker-sheet')).toBeTruthy();
      await fireEvent.press(view.getByLabelText('Close sheet'));
      expect(overlayType(view)).toBe('none');
      expect(view.queryByTestId('topic-picker-sheet')).toBeNull();
    }

    expect(view.getByTestId('home-topic-selector').props.accessibilityState?.disabled).not.toBe(true);
  });

  it('selects a topic from the picker and closes', async () => {
    const selectTopic = jest.fn();
    useAppStateMock.mockReturnValue(baseState({ selectTopic }));
    const view = await renderWorkspace();

    await fireEvent.press(view.getByTestId('home-topic-selector'));
    await fireEvent.press(view.getByLabelText('Water'));
    expect(selectTopic).toHaveBeenCalledWith('topic.water');
    expect(view.queryByTestId('topic-picker-sheet')).toBeNull();
    expect(overlayType(view)).toBe('none');
  });

  it('opens create, cancels, and opens again without a stale lock', async () => {
    const view = await renderWorkspace();

    await fireEvent.press(view.getByTestId('home-topic-add'));
    expect(view.getByTestId('topic-name-editor')).toBeTruthy();
    await fireEvent.press(view.getByText('Cancel'));
    expect(view.queryByTestId('topic-name-editor')).toBeNull();

    await fireEvent.press(view.getByTestId('home-topic-add'));
    expect(view.getByTestId('topic-name-editor')).toBeTruthy();
    await fireEvent.press(view.getByText('Cancel'));
    expect(view.queryByTestId('topic-name-editor')).toBeNull();
    expect(overlayType(view)).toBe('none');
  });

  it('keeps create open on validation error and resets after success', async () => {
    const createTopic = jest
      .fn()
      .mockReturnValueOnce({ topic: null, error: 'required' })
      .mockReturnValueOnce({
        topic: createCustomTopic('Zikir', '2026-09-20T00:00:00.000Z', 'topic.zikir'),
        error: null,
      });
    useAppStateMock.mockReturnValue(baseState({ createTopic }));
    const view = await renderWorkspace();

    await fireEvent.press(view.getByTestId('home-topic-add'));
    await fireEvent.press(view.getByText('Create'));
    expect(view.getByTestId('topic-name-editor')).toBeTruthy();
    expect(overlayType(view)).toBe('create');

    await fireEvent.changeText(view.getByLabelText('Topic name'), 'Zikir');
    await fireEvent.press(view.getByText('Create'));
    expect(createTopic).toHaveBeenLastCalledWith('Zikir');
    expect(view.queryByTestId('topic-name-editor')).toBeNull();
    expect(view.getByTestId('home-topic-add')).toBeTruthy();
  });

  it('replaces picker with create so only one overlay exists', async () => {
    const view = await renderWorkspace();

    await fireEvent.press(view.getByTestId('home-topic-selector'));
    expect(view.getByTestId('topic-picker-sheet')).toBeTruthy();
    expect(view.queryByTestId('topic-name-editor')).toBeNull();

    await fireEvent.press(view.getByTestId('home-topic-add'));
    expect(view.queryByTestId('topic-picker-sheet')).toBeNull();
    expect(view.getByTestId('topic-name-editor')).toBeTruthy();
    expect(overlayType(view)).toBe('create');
  });

  it('replaces picker with rename so overlays stay exclusive', async () => {
    const view = await renderWorkspace();

    await fireEvent.press(view.getByTestId('home-topic-selector'));
    await fireEvent.press(view.getByLabelText('Rename Water'));
    expect(view.queryByTestId('topic-picker-sheet')).toBeNull();
    expect(view.getByTestId('topic-name-editor')).toBeTruthy();
    expect(view.getByText('Rename topic')).toBeTruthy();
    expect(overlayType(view)).toBe('rename');
  });

  it('uses the compact selector without a local add control', async () => {
    const selectTopic = jest.fn();
    useAppStateMock.mockReturnValue(baseState({ selectTopic }));
    const view = await renderWorkspace('compact');

    expect(view.getByTestId('compact-topic-selector')).toBeTruthy();
    expect(view.queryByTestId('home-topic-add')).toBeNull();

    await fireEvent.press(view.getByTestId('compact-topic-selector'));
    await fireEvent.press(view.getByLabelText('Water'));
    expect(selectTopic).toHaveBeenCalledWith('topic.water');
  });
});
