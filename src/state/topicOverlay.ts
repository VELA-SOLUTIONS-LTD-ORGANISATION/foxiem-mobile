export type TopicOverlay =
  | { type: 'none' }
  | { type: 'picker' }
  | { type: 'create' }
  | { type: 'rename'; topicId: string };

export const CLOSED_TOPIC_OVERLAY: TopicOverlay = { type: 'none' };

/** Exclusive replace — never stack picker/create/rename. */
export function replaceTopicOverlay(_current: TopicOverlay, next: TopicOverlay): TopicOverlay {
  return next;
}

export function isTopicOverlayOpen(overlay: TopicOverlay): boolean {
  return overlay.type !== 'none';
}

export function topicOverlayKind(overlay: TopicOverlay): TopicOverlay['type'] {
  return overlay.type;
}
