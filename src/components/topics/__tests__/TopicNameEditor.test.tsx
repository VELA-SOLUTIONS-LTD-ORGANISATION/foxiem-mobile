import type { ComponentProps } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TopicEditorSheet, TopicNameEditor } from '@/components/topics/TopicNameEditor';
import { i18n } from '@/i18n';

jest.mock('@/components/overlays/BottomSheet', () => {
  const React = require('react');
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  return {
    BottomSheet: ({
      visible,
      title,
      onClose,
      children,
      compact,
      showClose,
      keyboardAware,
    }: {
      visible: boolean;
      title?: string;
      onClose: () => void;
      children: React.ReactNode;
      compact?: boolean;
      showClose?: boolean;
      keyboardAware?: boolean;
    }) =>
      visible
        ? React.createElement(
            MockView,
            { testID: 'topic-editor-sheet', accessibilityValue: { text: `${compact}-${showClose}-${keyboardAware}` } },
            title ? React.createElement(MockText, null, title) : null,
            showClose
              ? React.createElement(
                  MockPressable,
                  { accessibilityRole: 'button', accessibilityLabel: 'Close sheet', onPress: onClose },
                  React.createElement(MockText, null, 'Close sheet'),
                )
              : null,
            children,
          )
        : null,
  };
});

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderEditor(
  props?: Partial<ComponentProps<typeof TopicNameEditor>>,
) {
  const onSubmit = props?.onSubmit ?? jest.fn().mockReturnValue(null);
  const onClose = props?.onClose ?? jest.fn();
  return render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <I18nextProvider i18n={i18n}>
        <TopicNameEditor
          visible
          mode="create"
          value={props?.value ?? ''}
          onChangeText={props?.onChangeText ?? jest.fn()}
          onSubmit={onSubmit}
          onClose={onClose}
          {...props}
        />
      </I18nextProvider>
    </SafeAreaProvider>,
  );
}

describe('TopicNameEditor', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders compact create chrome with side-by-side actions', async () => {
    const view = await renderEditor();
    expect(view.getByText('New topic')).toBeTruthy();
    expect(view.getByText('Topic name')).toBeTruthy();
    expect(view.getByLabelText('Topic name')).toBeTruthy();
    expect(view.getByText('Cancel')).toBeTruthy();
    expect(view.getByText('Create')).toBeTruthy();
    expect(view.getByLabelText('Close sheet')).toBeTruthy();
    expect(view.getByTestId('topic-editor-sheet').props.accessibilityValue.text).toBe('true-true-true');
  });

  it('closes from Cancel and the close control', async () => {
    const onClose = jest.fn();
    const view = await renderEditor({ onClose });
    await fireEvent.press(view.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    await fireEvent.press(view.getByLabelText('Close sheet'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('submits from Create and from the keyboard Done action', async () => {
    const onSubmit = jest.fn().mockReturnValue(null);
    const view = await renderEditor({ value: 'Zikir', onSubmit });
    await fireEvent.press(view.getByText('Create'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await fireEvent(view.getByLabelText('Topic name'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('keeps the same editor for rename', async () => {
    const view = await renderEditor({ mode: 'rename', value: 'Water' });
    expect(view.getByText('Rename topic')).toBeTruthy();
    expect(view.getByText('Save')).toBeTruthy();
    expect(TopicEditorSheet).toBe(TopicNameEditor);
  });
});
