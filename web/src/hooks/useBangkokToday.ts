import { useEffect, useState } from 'react';
import { bangkokToday, msUntilNextBangkokMidnight } from '../utils/date';

/**
 * Today's Bangkok calendar date (`YYYY-MM-DD`) that stays current while a page is open
 * (L7-01). It re-renders the caller at the next Bangkok midnight, and also when the window
 * regains focus or the tab becomes visible, because browsers delay timers in background
 * tabs and while the computer sleeps.
 */
export function useBangkokToday(): string {
  const [today, setToday] = useState(() => bangkokToday());

  useEffect(() => {
    // Setting the same string again does not re-render.
    const refresh = () => setToday(bangkokToday());
    let timer: number | undefined;
    const scheduleNextMidnight = () => {
      // A short margin so the timer never fires a moment before midnight.
      timer = window.setTimeout(() => {
        refresh();
        scheduleNextMidnight();
      }, msUntilNextBangkokMidnight() + 100);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    scheduleNextMidnight();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  return today;
}
