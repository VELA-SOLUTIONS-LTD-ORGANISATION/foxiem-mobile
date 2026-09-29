import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { TrackerSnapshot } from '@/domain/analysis';
import type { Tracker } from '@/domain/types';
import { formatNumber } from '@/format';
import { NOTICE_IDS, useCountFeedback, useNotices, usePreferences, useTrackerStore, type TapReceipt } from '@/state';

export type CountResult = { receipt: TapReceipt; completed: boolean } | null;

/** Crossing the goal on this tap: the one moment that earns a celebration. */
export function completesGoal(tracker: Tracker, before: TrackerSnapshot, delta: number): boolean {
  if (delta <= 0 || !tracker.target) {
    return false;
  }
  if (tracker.intent === 'reach') {
    return before.periodValue < tracker.target && before.periodValue + delta >= tracker.target;
  }
  if (tracker.intent === 'consistency') {
    return before.today === 0 && before.activeDaysThisWeek + 1 === tracker.target;
  }
  return false;
}

function reachesLimit(tracker: Tracker, before: TrackerSnapshot, delta: number): boolean {
  return (
    tracker.intent === 'limit' &&
    Boolean(tracker.target) &&
    delta > 0 &&
    before.periodValue < tracker.target! &&
    before.periodValue + delta >= tracker.target!
  );
}

/** Count, record for Undo, and give feedback in one call so Home and Detail behave the same. */
export function useCounting(): (
  tracker: Tracker,
  before: TrackerSnapshot,
  direction: 'up' | 'down',
  amount?: number,
) => CountResult {
  const { t } = useTranslation();
  const { tap } = useTrackerStore();
  const feedback = useCountFeedback();
  const { haptic, language } = usePreferences();
  const notices = useNotices();

  return useCallback(
    (tracker, before, direction, amount) => {
      const receipt = tap(tracker.id, direction, amount);
      if (!receipt) {
        return null;
      }
      feedback.record(receipt);
      const completed = completesGoal(tracker, before, receipt.delta);
      haptic(completed ? 'success' : reachesLimit(tracker, before, receipt.delta) ? 'limit' : direction === 'up' ? 'increment' : 'decrement');
      const name = tracker.name;
      const value = formatNumber(before.hero + receipt.delta, language);
      AccessibilityInfo.announceForAccessibility(
        tracker.intent === 'consistency'
          ? completed
            ? t('a11y.countedGoal', { name, value: formatNumber(before.activeDaysThisWeek + 1, language) })
            : t('a11y.countedLogged', { name })
          : completed
            ? t('a11y.countedGoal', { name, value })
            : t('a11y.counted', { name, value }),
      );
      if (!notices.isDismissed(NOTICE_IDS.homeHint)) {
        notices.dismiss(NOTICE_IDS.homeHint);
      }
      return { receipt, completed };
    },
    [feedback, haptic, language, notices, t, tap],
  );
}
