import { fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import {
  CLOSED_TOPIC_OVERLAY,
  isTopicOverlayOpen,
  replaceTopicOverlay,
  topicOverlayKind,
} from '@/state/topicOverlay';
import { useTopicOverlay } from '@/state/useTopicOverlay';

function OverlayProbe() {
  const { overlay, openPicker, openCreate, openRename, close } = useTopicOverlay();
  return (
    <View>
      <Text testID="overlay-kind">{overlay.type}</Text>
      <Text testID="overlay-topic">{overlay.type === 'rename' ? overlay.topicId : ''}</Text>
      <Pressable testID="open-picker" onPress={openPicker}>
        <Text>Open picker</Text>
      </Pressable>
      <Pressable testID="open-create" onPress={openCreate}>
        <Text>Open create</Text>
      </Pressable>
      <Pressable testID="open-rename" onPress={() => openRename('topic.water')}>
        <Text>Open rename</Text>
      </Pressable>
      <Pressable testID="close-overlay" onPress={close}>
        <Text>Close overlay</Text>
      </Pressable>
    </View>
  );
}

describe('topic overlay exclusivity', () => {
  it('replaces any open overlay instead of stacking', () => {
    expect(replaceTopicOverlay({ type: 'picker' }, { type: 'create' })).toEqual({ type: 'create' });
    expect(replaceTopicOverlay({ type: 'create' }, { type: 'rename', topicId: 'topic.water' })).toEqual({
      type: 'rename',
      topicId: 'topic.water',
    });
    expect(replaceTopicOverlay({ type: 'rename', topicId: 'a' }, CLOSED_TOPIC_OVERLAY)).toEqual({
      type: 'none',
    });
    expect(isTopicOverlayOpen({ type: 'picker' })).toBe(true);
    expect(isTopicOverlayOpen(CLOSED_TOPIC_OVERLAY)).toBe(false);
    expect(topicOverlayKind({ type: 'rename', topicId: 'x' })).toBe('rename');
  });

  it('keeps exactly one overlay kind in hook state', async () => {
    const view = await render(<OverlayProbe />);
    expect(view.getByTestId('overlay-kind').props.children).toBe('none');

    await fireEvent.press(view.getByTestId('open-picker'));
    expect(view.getByTestId('overlay-kind').props.children).toBe('picker');

    await fireEvent.press(view.getByTestId('open-create'));
    expect(view.getByTestId('overlay-kind').props.children).toBe('create');

    await fireEvent.press(view.getByTestId('open-rename'));
    expect(view.getByTestId('overlay-kind').props.children).toBe('rename');
    expect(view.getByTestId('overlay-topic').props.children).toBe('topic.water');

    await fireEvent.press(view.getByTestId('close-overlay'));
    expect(view.getByTestId('overlay-kind').props.children).toBe('none');
  });
});
