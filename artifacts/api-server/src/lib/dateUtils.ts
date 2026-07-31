/**
 * Timezone-aware date utilities.
 *
 * All functions accept an IANA timezone string (e.g. "America/New_York").
 * localDateStr / localYesterdayStr fall back to UTC for users without a stored
 * timezone, preserving the original behaviour for accounts created before
 * timezone capture was added.  localHour and pgTimezone fall back to
 * "America/New_York" (push-notification default).
 */

const DEFAULT_TZ = "America/New_York";

/**
 * Return the date string (YYYY-MM-DD) for the given date (defaults to now)
 * in the user's local timezone.
 *
 * Falls back to UTC for users without a stored timezone, preserving the
 * existing behaviour for accounts created before timezone capture was added.
 */
export function localDateStr(
  timezone: string | null | undefined,
  date?: Date,
): string {
  const d = date ?? new Date();
  if (!timezone) {
    // No timezone stored — keep original UTC behaviour
    return d.toISOString().split("T")[0];
  }
  try {
    // en-CA locale always returns YYYY-MM-DD
    return d.toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    // Unknown / invalid timezone string — fall back to UTC
    return d.toISOString().split("T")[0];
  }
}

/**
 * Return the *previous* calendar date string (YYYY-MM-DD) in the user's
 * local timezone.
 *
 * DST-safe: we derive yesterday purely from the local calendar date string
 * (not by subtracting 86,400,000 ms), so spring-forward 23-hour days never
 * accidentally skip two calendar days.
 */
export function localYesterdayStr(timezone: string | null | undefined): string {
  const todayStr = localDateStr(timezone);
  const [year, month, day] = todayStr.split("-").map(Number);
  // Use UTC arithmetic on the parsed components to avoid server-locale DST effects
  const prev = new Date(Date.UTC(year, month - 1, day - 1));
  return prev.toISOString().split("T")[0];
}

/** Return the user's current local hour (0-23) given an IANA timezone string.
 *  Falls back to "America/New_York" for existing users without a stored timezone. */
export function localHour(timezone: string | null | undefined): number {
  const tz = timezone || DEFAULT_TZ;
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()),
      10,
    );
  } catch {
    // Unknown timezone string — fall back to UTC
    return new Date().getUTCHours();
  }
}

/**
 * The IANA timezone string to pass to PostgreSQL's AT TIME ZONE operator.
 * Falls back to DEFAULT_TZ if the value is empty/null so SQL never receives
 * an empty string that would cause a DB error.
 */
export function pgTimezone(timezone: string | null | undefined): string {
  return timezone || DEFAULT_TZ;
}
