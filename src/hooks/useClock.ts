import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Current time that advances on minute boundaries and whenever the app returns to the
 * foreground, so "today", streaks and period resets are always right without polling fast.
 */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      const current = new Date();
      const untilNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 50;
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, untilNextMinute);
    };
    schedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date());
      }
    });
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      subscription.remove();
    };
  }, []);

  return now;
}
