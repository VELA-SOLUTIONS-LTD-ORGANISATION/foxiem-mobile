import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useTrackerStore, type TapReceipt } from './TrackerStore';

export const UNDO_WINDOW_MS = 5000;

type Pending = TapReceipt & { expiresAt: number };

type CountFeedbackValue = {
  pending: Pending | null;
  /** Record a tap so Undo can revert exactly what the user just saw. */
  record: (receipt: TapReceipt) => void;
  undo: () => boolean;
  dismiss: () => void;
};

const CountFeedbackContext = createContext<CountFeedbackValue | null>(null);

export function CountFeedbackProvider({ children }: { children: ReactNode }) {
  const { undo: undoTaps } = useTrackerStore();
  const [pending, setPending] = useState<Pending | null>(null);
  const latest = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const set = useCallback((next: Pending | null) => {
    latest.current = next;
    setPending(next);
    clearTimer();
    if (next) {
      timer.current = setTimeout(() => {
        latest.current = null;
        setPending(null);
      }, Math.max(0, next.expiresAt - Date.now()));
    }
  }, []);

  useEffect(() => clearTimer, []);

  const record = useCallback(
    (receipt: TapReceipt) => {
      const previous = latest.current;
      const expiresAt = Date.now() + UNDO_WINDOW_MS;
      if (previous && receipt.merged && previous.eventId === receipt.eventId) {
        set({ ...receipt, delta: previous.delta + receipt.delta, expiresAt });
      } else {
        set({ ...receipt, expiresAt });
      }
    },
    [set],
  );

  const undo = useCallback(() => {
    const current = latest.current;
    if (!current) {
      return false;
    }
    set(null);
    return undoTaps(current);
  }, [set, undoTaps]);

  const dismiss = useCallback(() => set(null), [set]);

  const value = useMemo(() => ({ pending, record, undo, dismiss }), [pending, record, undo, dismiss]);
  return <CountFeedbackContext.Provider value={value}>{children}</CountFeedbackContext.Provider>;
}

export function useCountFeedback(): CountFeedbackValue {
  const context = useContext(CountFeedbackContext);
  if (!context) {
    throw new Error('useCountFeedback must be used within CountFeedbackProvider');
  }
  return context;
}
