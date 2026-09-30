import { useCallback } from 'react';

import { usePro } from '@/pro/ProProvider';
import { resetFoxiemAppData } from '@/storage';
import { getSurfaceBridge } from '@/widgets/bridge';

import { useCountFeedback } from './CountFeedbackProvider';
import { useNotices } from './NoticesProvider';
import { usePreferences } from './PreferencesProvider';
import { useReminders } from './ReminderProvider';
import { useTrackerStore } from './TrackerStore';

/**
 * Reset Foxiem: cancel scheduled reminders, remove every `foxiem.*` key and return every
 * store to its fresh state. Store subscriptions are not affected (they belong to the
 * user's Apple / Google account) and are found again by Restore Purchases.
 */
export function useResetFoxiem(): () => Promise<void> {
  const store = useTrackerStore();
  const reminders = useReminders();
  const preferences = usePreferences();
  const pro = usePro();
  const notices = useNotices();
  const feedback = useCountFeedback();

  return useCallback(async () => {
    feedback.dismiss();
    await reminders.cancelAll();
    await store.flush();
    // Forget what widgets and the Watch were showing or had queued, before the data underneath them goes.
    await getSurfaceBridge().clear().catch(() => undefined);
    await resetFoxiemAppData();
    store.clearAll();
    reminders.clearAll();
    notices.clearAll();
    await preferences.reset();
    await pro.clearCache();
  }, [feedback, notices, preferences, pro, reminders, store]);
}
