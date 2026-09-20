import {
  createCustomTopic,
  createDefaultTopic,
  DEFAULT_TOPIC_ID,
  getTopicDisplayName,
  MAX_TOPIC_COUNT,
  validateTopicName,
} from '@/state/topics';

describe('topic helpers', () => {
  it('keeps default id stable and localizes only the visible name', () => {
    const topic = createDefaultTopic(47);
    expect(topic.id).toBe(DEFAULT_TOPIC_ID);
    expect(topic.kind).toBe('default');
    expect(getTopicDisplayName(topic, () => 'General')).toBe('General');
    expect(getTopicDisplayName(topic, () => 'Genel')).toBe('Genel');
  });

  it('rejects blank, long, reserved, and duplicate names', () => {
    const topics = [createDefaultTopic(), createCustomTopic('Water')];
    expect(validateTopicName('   ', topics)).toBe('required');
    expect(validateTopicName('x'.repeat(41), topics)).toBe('tooLong');
    expect(validateTopicName('water', topics)).toBe('duplicate');
    expect(validateTopicName(' Water', topics)).toBe('duplicate');
    expect(validateTopicName('Genel', topics)).toBe('reserved');
    expect(validateTopicName('General', topics, { translate: () => 'General' })).toBe('reserved');
  });

  it('allows rename of the same custom topic to its current name', () => {
    const water = createCustomTopic('Water');
    const topics = [createDefaultTopic(), water];
    expect(validateTopicName('Water', topics, { excludeTopicId: water.id })).toBeNull();
  });

  it('enforces the 20-topic limit including default', () => {
    const topics = [
      createDefaultTopic(),
      ...Array.from({ length: MAX_TOPIC_COUNT - 1 }, (_, index) => createCustomTopic(`Topic ${index}`)),
    ];
    expect(topics).toHaveLength(20);
    expect(validateTopicName('Another', topics)).toBe('limit');
  });
});
