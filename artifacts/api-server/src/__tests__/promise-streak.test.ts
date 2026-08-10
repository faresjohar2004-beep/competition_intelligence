/**
 * Unit tests for promise-streak logic (src/lib/promiseStreak.ts).
 *
 * Covers the four critical edge cases the reviewer called out:
 *   1. No-promise mission completion must not credit the streak.
 *   2. Consecutive local dates extend the streak.
 *   3. Duplicate requests (same local day) are idempotent.
 *   4. A missed day resets the streak to 1 on the next kept promise.
 *   5. A missed day followed by a new promise resets to 1 (not extend).
 */
import { describe, it, expect } from "vitest";
import { computePromiseStreak } from "../lib/promiseStreak.js";

const TODAY = "2026-08-05";
const YESTERDAY = "2026-08-04";
const TWO_DAYS_AGO = "2026-08-03";

describe("computePromiseStreak", () => {
  it("does not credit when tomorrowPromise is absent", () => {
    const result = computePromiseStreak({
      tomorrowPromise: null,
      lastPromiseDate: YESTERDAY,
      promiseStreak: 5,
      localToday: TODAY,
      localYesterday: YESTERDAY,
    });
    expect(result.credit).toBe(false);
    expect(result.newPromiseStreak).toBe(5); // unchanged
  });

  it("does not credit when tomorrowPromise is empty string", () => {
    const result = computePromiseStreak({
      tomorrowPromise: "",
      lastPromiseDate: YESTERDAY,
      promiseStreak: 3,
      localToday: TODAY,
      localYesterday: YESTERDAY,
    });
    expect(result.credit).toBe(false);
    expect(result.newPromiseStreak).toBe(3);
  });

  it("increments streak on consecutive day with outstanding promise", () => {
    const result = computePromiseStreak({
      tomorrowPromise: "I will train for 30 minutes",
      lastPromiseDate: YESTERDAY,
      promiseStreak: 6,
      localToday: TODAY,
      localYesterday: YESTERDAY,
    });
    expect(result.credit).toBe(true);
    expect(result.newPromiseStreak).toBe(7);
  });

  it("starts streak at 1 when there is no prior lastPromiseDate (first ever kept promise)", () => {
    const result = computePromiseStreak({
      tomorrowPromise: "I will do the work",
      lastPromiseDate: null,
      promiseStreak: 0,
      localToday: TODAY,
      localYesterday: YESTERDAY,
    });
    expect(result.credit).toBe(true);
    expect(result.newPromiseStreak).toBe(1);
  });

  it("is idempotent — does not credit again when already credited today", () => {
    const result = computePromiseStreak({
      tomorrowPromise: "I will show up again",
      lastPromiseDate: TODAY,   // <-- already credited today
      promiseStreak: 4,
      localToday: TODAY,
      localYesterday: YESTERDAY,
    });
    expect(result.credit).toBe(false);
    expect(result.newPromiseStreak).toBe(4);
  });

  it("resets streak to 1 when a day was missed (lastPromiseDate is 2 days ago)", () => {
    const result = computePromiseStreak({
      tomorrowPromise: "I will keep going",
      lastPromiseDate: TWO_DAYS_AGO,  // gap — yesterday was skipped
      promiseStreak: 10,
      localToday: TODAY,
      localYesterday: YESTERDAY,
    });
    expect(result.credit).toBe(true);
    expect(result.newPromiseStreak).toBe(1); // chain broken → reset
  });

  it("resets streak to 1 when user missed many days before making a new promise", () => {
    const result = computePromiseStreak({
      tomorrowPromise: "Starting fresh",
      lastPromiseDate: "2026-07-01",  // weeks ago
      promiseStreak: 20,
      localToday: TODAY,
      localYesterday: YESTERDAY,
    });
    expect(result.credit).toBe(true);
    expect(result.newPromiseStreak).toBe(1);
  });
});
