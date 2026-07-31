/**
 * Timezone-aware date utilities.
 *
 * All functions accept an IANA timezone string (e.g. "America/New_York").
 * When timezone is null/undefined they fall back to "America/New_York" so
 * existing users without a stored timezone get reasonable behavior rather
 * than UTC dates that could mis-fire their streak at midnight ET.
 */

const DEFAULT_TZ = "America/New_York";

/** Today's date in the user's local timezone as a YYYY-MM-DD string. */
export function localDateStr(timezone: string | null | undefined): string {
  const tz = timezone || DEFAULT_TZ;
  try {
    // "en-CA" locale reliably formats as YYYY-MM-DD
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/** Yesterday's date in the user's local timezone as a YYYY-MM-DD string. */
export function localYesterdayStr(timezone: string | null | undefined): string {
  const tz = timezone || DEFAULT_TZ;
  try {
    return new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  }
}

/** Current hour (0-23) in the user's local timezone. */
export function localHour(timezone: string | null | undefined): number {
  const tz = timezone || DEFAULT_TZ;
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()),
      10,
    );
  } catch {
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
