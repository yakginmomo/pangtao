import { describe, it, expect } from 'vitest';
import {
  BACKDATE_LIMIT_DAYS,
  isBeforeBackdateLimit,
  oldestAllowedDate,
} from '../../server/src/utils/date.util.js';
import * as web from '../../web/src/utils/date.js';

const BANGKOK = 'Asia/Bangkok';

describe('F-05 Payment and Charge (unit rules)', () => {
  it('TEST-05.14 (AC-05.14): the 90-day limit accepts T−90, rejects T−91, and moves at Bangkok midnight', () => {
    expect(BACKDATE_LIMIT_DAYS).toBe(90);

    // 2026-11-25T05:00Z = 12:00 in Bangkok on 25 Nov.
    const noon = new Date('2026-11-25T05:00:00Z');
    expect(oldestAllowedDate(BANGKOK, noon)).toBe('2026-08-27');
    expect(isBeforeBackdateLimit('2026-08-27', BANGKOK, noon)).toBe(false); // T−90
    expect(isBeforeBackdateLimit('2026-08-26', BANGKOK, noon)).toBe(true); // T−91
    expect(isBeforeBackdateLimit('2026-11-25', BANGKOK, noon)).toBe(false); // today

    // 2026-11-25T17:30Z = 00:30 in Bangkok on 26 Nov, while UTC is still on 25 Nov.
    const afterMidnight = new Date('2026-11-25T17:30:00Z');
    expect(oldestAllowedDate(BANGKOK, afterMidnight)).toBe('2026-08-28');
    expect(isBeforeBackdateLimit('2026-08-28', BANGKOK, afterMidnight)).toBe(false);
    expect(isBeforeBackdateLimit('2026-08-27', BANGKOK, afterMidnight)).toBe(true);

    // Across a year and a leap day: 2028-05-29 − 90 days = 2028-02-29.
    const leap = new Date('2028-05-29T05:00:00Z');
    expect(oldestAllowedDate(BANGKOK, leap)).toBe('2028-02-29');
    expect(oldestAllowedDate(BANGKOK, new Date('2027-01-15T05:00:00Z'))).toBe('2026-10-17');
  });

  it('the web form uses the same window as the server (f-05 §2.2 v1.3)', () => {
    for (const instant of ['2026-11-25T05:00:00Z', '2026-11-25T17:30:00Z', '2028-05-29T05:00:00Z']) {
      const now = new Date(instant);
      expect(web.BACKDATE_LIMIT_DAYS, instant).toBe(BACKDATE_LIMIT_DAYS);
      expect(web.oldestAllowedDate(now), instant).toBe(oldestAllowedDate(BANGKOK, now));
      expect(web.isBeforeBackdateLimit(oldestAllowedDate(BANGKOK, now), now), instant).toBe(false);
    }
  });
});
