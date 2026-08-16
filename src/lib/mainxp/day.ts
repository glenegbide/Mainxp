// MAINXP time model: a "day" is midnight-to-midnight in the user's IANA timezone.
// All daily/weekly records key on these strings; timestamps stay UTC in the DB.

/** "YYYY-MM-DD" for the given instant in the user's timezone. */
export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** ISO-8601 week, e.g. "2026-W33", for the given instant in the user's timezone. */
export function weekKey(date: Date, timeZone: string): string {
  const [y, m, d] = dayKey(date, timeZone).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - weekday + 3); // ISO week is defined by its Thursday
  const isoYear = dt.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const week =
    1 +
    Math.round(
      ((dt.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7
    );
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Shift a dayKey by n days (calendar arithmetic, DST-safe because keys are dates). */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Timezone offset (ms, UTC→local) in effect at the given instant. */
export function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/** UTC instant of local midnight for the day containing `date` in the user's timezone. */
export function dayStartUtc(date: Date, timeZone: string): Date {
  const [y, m, d] = dayKey(date, timeZone).split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  return new Date(utcMidnight - tzOffsetMs(new Date(utcMidnight), timeZone));
}

/** Whole days from key a to key b (b − a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}
