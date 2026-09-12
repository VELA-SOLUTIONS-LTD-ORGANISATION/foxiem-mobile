import { createLocalId } from '@/utils/id';

describe('createLocalId', () => {
  it('produces unique ids in practical batch size', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createLocalId()));
    expect(ids.size).toBe(500);
  });
});
