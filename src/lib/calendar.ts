/**
 * The demo runs on its own calendar so that every deadline stays in the future
 * whenever someone visits. Day 0 is the morning of Monday, March 1, 2027, and
 * each later day is the next working morning.
 *
 * Dates in solicitations are local wall-clock times with no zone ("2027-03-18T14:00").
 * They are handled as if they were UTC, so the server and the browser agree.
 */

const START = Date.UTC(2027, 2, 1);
const DAY_MS = 86_400_000;
/** The hour the morning check runs. */
const MORNING_HOUR = 7;

/** The last morning of the demo: Monday, March 15, 2027. */
export const MAX_DAY = 10;

/** Midnight at the start of a demo day. Works for days before day 0 as well. */
export function dateOfDay(day: number): Date {
  const weeks = Math.floor(day / 5);
  const rest = day - weeks * 5;
  return new Date(START + (weeks * 7 + rest) * DAY_MS);
}

const morningOf = (day: number) => dateOfDay(day).getTime() + MORNING_HOUR * 3_600_000;

const hasTime = (when: string) => when.includes("T");

/** A date from a solicitation as a moment. A date with no time means the end of that day. */
export function parseWhen(when: string): Date {
  return new Date(hasTime(when) ? `${when}:00Z` : `${when}T23:59:00Z`);
}

/** Whole calendar days from the demo's today to a date. Zero is today, negative is past. */
export function daysUntil(when: string, day: number): number {
  const target = Date.UTC(Number(when.slice(0, 4)), Number(when.slice(5, 7)) - 1, Number(when.slice(8, 10)));
  return Math.round((target - dateOfDay(day).getTime()) / DAY_MS);
}

export function isPast(when: string, day: number): boolean {
  return parseWhen(when).getTime() < morningOf(day);
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options });
const SHORT = fmt({ weekday: "short", month: "short", day: "numeric" });
const LONG = fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" });
const TIME = fmt({ hour: "numeric", minute: "2-digit" });

/**
 * Every agency in the demo is in Utah and gives its deadlines in local time,
 * so one zone covers them all. A real build reads the zone from each solicitation.
 */
export const ZONE = { name: "Mountain Time", short: "MT" };

/** "2:00 PM", or "noon" for twelve o'clock, which is how solicitations write it. */
const fmtTime = (date: Date) => (date.getUTCHours() === 12 && date.getUTCMinutes() === 0 ? "noon" : TIME.format(date));

/** "Monday, March 1, 2027" */
export const fmtLongDay = (day: number) => LONG.format(dateOfDay(day));
/** "Mon, Mar 1" */
export const fmtShortDay = (day: number) => SHORT.format(dateOfDay(day));

/** "Thu, Mar 18 at 2:00 PM", or "Thu, Mar 18" when the solicitation gave no time. */
export function fmtWhen(when: string): string {
  const date = parseWhen(when);
  return hasTime(when) ? `${SHORT.format(date)} at ${fmtTime(date)}` : SHORT.format(date);
}

/** How long is left, in the words a person would use. */
export function countdown(when: string, day: number): string {
  if (isPast(when, day)) return "Closed";
  const days = daysUntil(when, day);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}

const MONTH_DAY = fmt({ month: "short", day: "numeric" });
const WEEKDAY = fmt({ weekday: "short" });

/** The two lines of a deadline stamp: "Mar 18" and "Thu, 2:00 PM MT". */
export function stampParts(when: string): { date: string; time: string } {
  const date = parseWhen(when);
  return { date: MONTH_DAY.format(date), time: hasTime(when) ? `${WEEKDAY.format(date)}, ${fmtTime(date)} ${ZONE.short}` : WEEKDAY.format(date) };
}
