import { useCallback, useState } from 'react';

import { CLOSED_TOPIC_OVERLAY, replaceTopicOverlay, type TopicOverlay } from './topicOverlay';

export function useTopicOverlay(initial: TopicOverlay = CLOSED_TOPIC_OVERLAY) {
  const [overlay, setOverlayState] = useState<TopicOverlay>(initial);

  const setOverlay = useCallback((next: TopicOverlay) => {
    setOverlayState((current) => replaceTopicOverlay(current, next));
  }, []);

  const close = useCallback(() => setOverlay(CLOSED_TOPIC_OVERLAY), [setOverlay]);
  const openPicker = useCallback(() => setOverlay({ type: 'picker' }), [setOverlay]);
  const openCreate = useCallback(() => setOverlay({ type: 'create' }), [setOverlay]);
  const openRename = useCallback((topicId: string) => setOverlay({ type: 'rename', topicId }), [setOverlay]);

  return { overlay, setOverlay, close, openPicker, openCreate, openRename };
}
