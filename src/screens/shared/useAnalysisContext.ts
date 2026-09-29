import { useMemo } from 'react';

import type { Context } from '@/domain/analysis';
import { useClock } from '@/hooks';
import { usePreferences } from '@/state';

/** `{ now, weekStart }` that changes once a minute, so derived numbers stay cheap and current. */
export function useAnalysisContext(): Context {
  const now = useClock();
  const { weekStart } = usePreferences();
  const minute = Math.floor(now.getTime() / 60_000);
  return useMemo(() => ({ now: new Date(minute * 60_000 + 59_000), weekStart }), [minute, weekStart]);
}
