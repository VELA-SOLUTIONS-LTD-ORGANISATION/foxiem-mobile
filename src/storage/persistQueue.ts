/**
 * Serialized, latest-wins writer. Rapid updates never interleave: at most one write runs,
 * and anything enqueued meanwhile collapses into the newest snapshot.
 */
export function createLatestWinsQueue<T>(
  write: (snapshot: T) => Promise<void>,
  onError?: (error: unknown) => void,
): {
  enqueue: (snapshot: T) => void;
  flush: () => Promise<void>;
} {
  let pending: { value: T } | null = null;
  let tail: Promise<void> = Promise.resolve();

  const enqueue = (snapshot: T) => {
    pending = { value: snapshot };
    tail = tail
      .then(async () => {
        while (pending) {
          const next = pending.value;
          pending = null;
          try {
            await write(next);
          } catch (error) {
            onError?.(error);
          }
        }
      })
      .catch(() => undefined);
  };

  return {
    enqueue,
    flush: () => tail,
  };
}

/** One latest-wins queue per storage key. */
export function createKeyedWriter<T>(
  write: (key: string, snapshot: T) => Promise<void>,
  onError?: (error: unknown) => void,
): {
  enqueue: (key: string, snapshot: T) => void;
  flush: () => Promise<void>;
} {
  const queues = new Map<string, ReturnType<typeof createLatestWinsQueue<T>>>();
  return {
    enqueue: (key, snapshot) => {
      let queue = queues.get(key);
      if (!queue) {
        queue = createLatestWinsQueue<T>((value) => write(key, value), onError);
        queues.set(key, queue);
      }
      queue.enqueue(snapshot);
    },
    flush: async () => {
      await Promise.all([...queues.values()].map((queue) => queue.flush()));
    },
  };
}
