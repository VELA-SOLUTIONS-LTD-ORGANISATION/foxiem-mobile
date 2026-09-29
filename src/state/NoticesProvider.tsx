import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loadNotices, saveNotices } from '@/storage';

export const NOTICE_IDS = {
  whatsNewV3: 'whatsNew.v3',
  homeHint: 'hint.homeCount',
} as const;

type NoticesValue = {
  hydrated: boolean;
  isDismissed: (id: string) => boolean;
  dismiss: (id: string) => void;
  clearAll: () => void;
};

const NoticesContext = createContext<NoticesValue | null>(null);

export function NoticesProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadNotices()
      .then((notices) => {
        if (!cancelled) {
          setDismissed(notices.dismissed);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((current) => {
      if (current.includes(id)) {
        return current;
      }
      const next = [...current, id];
      void saveNotices({ dismissed: next }).catch(() => undefined);
      return next;
    });
  }, []);

  const isDismissed = useCallback((id: string) => dismissed.includes(id), [dismissed]);
  const clearAll = useCallback(() => setDismissed([]), []);

  const value = useMemo(() => ({ hydrated, isDismissed, dismiss, clearAll }), [hydrated, isDismissed, dismiss, clearAll]);
  return <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>;
}

export function useNotices(): NoticesValue {
  const context = useContext(NoticesContext);
  if (!context) {
    throw new Error('useNotices must be used within NoticesProvider');
  }
  return context;
}
