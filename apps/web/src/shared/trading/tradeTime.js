/**
 * Timezone-aware helpers for the chart display pipeline.
 *
 * Lightweight Charts renders unix-second times as UTC, with no built-in
 * timezone option. To display bars in the user's chosen IANA timezone, we
 * shift each bar's `time` by the timezone's offset (in seconds) so that the
 * chart's UTC rendering shows the correct local wall clock.
 *
 * The same offset is applied to trade markers and to focus-scroll targets
 * so everything stays aligned.
 *
 * Trade rows store `date` (YYYY-MM-DD) + `entryTime` (HH:MM) as the trader's
 * local wall clock. Callers pass the display timezone explicitly, so the
 * interpretation of those strings follows the user's current setting.
 */

/**
 * Offset of `tz` from UTC at the given moment, in SECONDS.
 * Positive = ahead of UTC (Asia/Kolkata => +19800), negative = behind (EST => -18000).
 * DST-aware because it uses Intl.DateTimeFormat on the actual moment.
 */
export function getTimezoneOffsetSeconds(tz, atUnixSeconds) {
  const seconds = atUnixSeconds != null
    ? atUnixSeconds
    : Math.floor(Date.now() / 1000);
  const date = new Date(seconds * 1000);

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    const y = get('year');
    const mo = get('month');
    const d = get('day');
    const h = get('hour') % 24;
    const mi = get('minute');
    const s = get('second');
    const localMs = Date.UTC(y, mo - 1, d, h, mi, s);
    return Math.floor((localMs - date.getTime()) / 1000);
  } catch {
    return 0;
  }
}

/**
 * Shift a raw UTC unix-second timestamp into the "display seconds" the chart
 * expects. Add `offsetSeconds` to make UTC rendering show the target TZ.
 */
export function toDisplaySeconds(utcSeconds, tz) {
  if (utcSeconds == null || !tz) return utcSeconds;
  return utcSeconds + getTimezoneOffsetSeconds(tz, utcSeconds);
}

/**
 * Interpret (date, time) as a wall clock in `tz`, return the TRUE UTC unix
 * seconds. Defaults to America/New_York for backward compatibility.
 */
export function tradeTimeToUtcSeconds(dateStr, timeStr, tz = 'America/New_York') {
  if (!dateStr || !timeStr) return null;

  const dateParts = String(dateStr).split('-').map(Number);
  const timeParts = String(timeStr).split(':').map(Number);
  if (dateParts.length < 3 || timeParts.length < 2) return null;

  const [y, mo, d] = dateParts;
  const [h, mi] = timeParts;
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;

  // Treat the naive wall clock as if it were UTC, then correct by the TZ
  // offset for that date. DST is handled by the Intl lookup.
  const naiveUtc = Math.floor(Date.UTC(y, mo - 1, d, h, mi) / 1000);
  const offsetSec = getTimezoneOffsetSeconds(tz, naiveUtc);
  return naiveUtc - offsetSec;
}