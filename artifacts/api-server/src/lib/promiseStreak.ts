/**
 * Promise streak helpers.
 *
 * Encapsulates the "kept a promise today?" decision so both the actions route
 * and the missions/complete route apply identical rules, and the logic can be
 * tested without a live database.
 */

export interface PromiseStreakInput {
  /** The user's stored tomorrowPromise (null/undefined = no outstanding commitment) */
  tomorrowPromise: string | null | undefined;
  /** Local date string of the last day a promise was credited (YYYY-MM-DD) */
  lastPromiseDate: string | null | undefined;
  /** Current stored promise streak */
  promiseStreak: number;
  /** Today's local date string (YYYY-MM-DD) */
  localToday: string;
  /** Yesterday's local date string (YYYY-MM-DD) */
  localYesterday: string;
}

export interface PromiseStreakResult {
  /** Whether the promise streak should be credited this call */
  credit: boolean;
  /** The new promise streak value to write (only meaningful when credit === true) */
  newPromiseStreak: number;
}

/**
 * Decide whether the current server action should credit the promise streak,
 * and compute the new count if so.
 *
 * Rules:
 *  - No credit if there is no outstanding tomorrowPromise.
 *  - No credit if the streak has already been credited today (idempotency).
 *  - Increment if lastPromiseDate was yesterday (consecutive day).
 *  - Reset to 1 if lastPromiseDate was earlier or absent (chain broken).
 */
export function computePromiseStreak(input: PromiseStreakInput): PromiseStreakResult {
  const { tomorrowPromise, lastPromiseDate, promiseStreak, localToday, localYesterday } = input;

  // Must have an outstanding written commitment.
  if (!tomorrowPromise) {
    return { credit: false, newPromiseStreak: promiseStreak };
  }

  // Idempotency: already credited today.
  if (lastPromiseDate === localToday) {
    return { credit: false, newPromiseStreak: promiseStreak };
  }

  // Consecutive day → extend streak; otherwise → start fresh.
  const newPromiseStreak = lastPromiseDate === localYesterday ? promiseStreak + 1 : 1;
  return { credit: true, newPromiseStreak };
}
