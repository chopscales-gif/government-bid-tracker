import Link from "next/link";
import { countdown, daysUntil, fmtShortDay, fmtTimeOf, fmtWhen, isPast, leafParts, stampParts } from "@/lib/calendar";
import type { Fit, Reason } from "@/lib/fit";
import { keyDates, nextDate, type KeyDate } from "@/lib/keydates";
import type { Row } from "@/server/queries";
import { Signal, StatusMark, VerdictMark } from "./ui";

export const hrefOf = (row: Row) => `/solicitations/${row.id}`;

/** A rule's finding in a few words, for a row. The full sentence is on the solicitation. */
export function brief(reason: Reason, miles: number, hasDue: boolean): string {
  if (reason.key === "distance") return `${miles} miles away`;
  if (reason.key === "time") return reason.level === "block" ? "Closed" : hasDue ? "Short notice" : "No due date found";
  if (reason.key === "work") return reason.level === "caution" ? "No work code" : "Not your kind of work";
  if (reason.key === "set_aside") return reason.level === "caution" ? "Restricted bidders" : "Set aside for others";
  if (reason.key === "licence") return "Needs a license you lack";
  if (reason.key === "size") return "Above your bonding limit";
  if (reason.key === "meeting") return "Mandatory meeting missed";
  return reason.label;
}

/** Why a solicitation is not a clean fit, in a few words: what stops you if anything does, otherwise what to check. */
export function fitNote(row: { fit: Fit; feed: { miles: number }; eff: { facts: { due?: unknown } } }): string | undefined {
  const stops = row.fit.reasons.filter((reason) => reason.level === "block");
  const said = (stops.length ? stops : row.fit.reasons.filter((reason) => reason.level === "caution")).map((reason) => brief(reason, row.feed.miles, Boolean(row.eff.facts.due)));
  if (!said.length) return undefined;
  return said.map((words, index) => (index === 0 ? words : words.charAt(0).toLowerCase() + words.slice(1))).join(", ");
}

/**
 * One solicitation as one line: what it is, when it is due, and the one thing
 * to know about it. The whole line opens the solicitation.
 */
export function SolicitationRow({ row, day, lead, tour, children }: { row: Row; day: number; lead?: string; tour?: boolean; children: React.ReactNode }) {
  const due = row.eff.facts.due?.value;
  const soon = due !== undefined && !isPast(due, day) && daysUntil(due, day) < 7;
  return (
    <li>
      <Link href={hrefOf(row)} className="row" data-tour={tour ? "row" : undefined}>
        <span className="min-w-0">
          <span className="row-title">{row.doc.title}</span>
          <span className="block text-muted">
            {lead && <span className="font-semibold text-accent-deep">{lead} </span>}
            {row.doc.agency}
          </span>
        </span>
        <span className={`row-due leading-snug ${soon ? "text-due" : ""}`}>
          {row.status === "passed" ? null : due ? (
            <>
              <span className="font-semibold md:block">{stampParts(due).date}</span>
              <span className={`text-[0.9375rem] max-md:ml-2 ${soon ? "" : "text-muted"}`}>{countdown(due, day)}</span>
            </>
          ) : (
            <span className="text-[0.9375rem] text-muted">No due date found</span>
          )}
        </span>
        <span className="row-fit">{children}</span>
        <span aria-hidden className="row-go">
          →
        </span>
      </Link>
    </li>
  );
}

/** A solicitation nobody has decided on yet, with the fit rules' verdict. */
export function MatchRow({ row, day, tour }: { row: Row; day: number; tour?: boolean }) {
  return (
    <SolicitationRow row={row} day={day} lead={row.foundToday ? "New." : undefined} tour={tour}>
      <VerdictMark verdict={row.fit.verdict} note={fitNote(row)} />
    </SolicitationRow>
  );
}

/** Something already being followed that an addendum has changed since anyone looked. */
export function ChangedRow({ row, day }: { row: Row; day: number }) {
  const addendum = row.unseen.at(-1)!;
  const changes = row.unseen.reduce((count, each) => count + each.changes.length, 0);
  return (
    <SolicitationRow row={row} day={day}>
      <Signal dot="bg-due" className="text-due" note={`${changes} ${changes === 1 ? "change" : "changes"}, found ${addendum.day === day ? "this morning" : fmtShortDay(addendum.day)}`}>
        Changed by Addendum {addendum.number}
      </Signal>
    </SolicitationRow>
  );
}

/** A solicitation already in the pipeline: where it stands and the one thing that comes next. */
export function PipelineRow({ row, day }: { row: Row; day: number }) {
  const next = nextDate(row.eff.facts, day);
  const done = row.eff.checklist.filter((item) => row.checked.includes(item.id)).length;
  const due = row.eff.facts.due?.value;
  const open = row.status === "bidding" || row.status === "watching";
  const note =
    open && due !== undefined && isPast(due, day)
      ? row.status === "bidding"
        ? "The deadline passed before it was handed in"
        : "The deadline has passed"
      : row.status === "bidding"
        ? `${done} of ${row.eff.checklist.length} on the checklist done`
        : row.status === "watching" && next && next.key !== "due"
          ? `${next.label}${next.mandatory ? " (mandatory)" : ""} ${fmtWhen(next.when)}`
          : row.status === "submitted"
            ? "Waiting for the award"
            : row.status === "passed" && row.reason
              ? row.reason
              : undefined;
  if (row.unseen.length > 0 && row.status !== "passed") {
    return (
      <SolicitationRow row={row} day={day}>
        <Signal dot="bg-due" className="text-due" note={`${STATUS_WORD[row.status] ?? ""}Addendum ${row.unseen.at(-1)!.number} to read`}>
          Changed
        </Signal>
      </SolicitationRow>
    );
  }
  return (
    <SolicitationRow row={row} day={day}>
      <StatusMark status={row.status} note={note} />
    </SolicitationRow>
  );
}

const STATUS_WORD: Partial<Record<Row["status"], string>> = { bidding: "Bidding. ", watching: "Watching. ", submitted: "Handed in. " };

const HORIZON = 14;

/** Every date still ahead, in the next two weeks, on the bids being worked and the solicitations being watched. */
export function comingDates(rows: Row[], day: number): { row: Row; date: KeyDate }[] {
  return rows
    .filter((row) => row.status === "bidding" || row.status === "watching")
    .flatMap((row) => keyDates(row.eff.facts, row.doc.type).map((date) => ({ row, date })))
    .filter(({ date }) => !isPast(date.when, day) && daysUntil(date.when, day) <= HORIZON)
    .sort((a, b) => a.date.when.localeCompare(b.date.when));
}

/** The nearest of those dates as one line, with the way to the rest. */
export function NextDateLine({ rows, day }: { rows: Row[]; day: number }) {
  const next = comingDates(rows, day)[0];
  return (
    <p>
      {next ? `Next date: ${fmtWhen(next.date.when).replace(" at ", ", ")}, ${next.date.label.toLowerCase()}.` : "Nothing you are following has a date in the next two weeks."}{" "}
      {next && (
        <Link href="/dates" className="quiet">
          All dates
        </Link>
      )}
    </p>
  );
}

/** The desk calendar: one leaf per day. A deadline inside a week is in orange, the same as on its row. */
export function DeskCalendar({ rows, day }: { rows: Row[]; day: number }) {
  const leaves = new Map<string, { row: Row; date: KeyDate }[]>();
  for (const entry of comingDates(rows, day)) leaves.set(entry.date.when.slice(0, 10), [...(leaves.get(entry.date.when.slice(0, 10)) ?? []), entry]);
  if (leaves.size === 0) return <p className="panel p-6 text-muted">Nothing you are following has a date in the next two weeks.</p>;
  return (
    <ol className="rows">
      {[...leaves].map(([iso, entries]) => {
        const leaf = leafParts(iso);
        const days = daysUntil(iso, day);
        return (
          <li key={iso} className="grid grid-cols-[6.5rem_minmax(0,1fr)] border-line not-first:border-t sm:grid-cols-[9rem_minmax(0,1fr)]">
            <p className="px-5 py-5 leading-snug sm:px-7">
              <span className="block font-semibold whitespace-nowrap">
                {leaf.weekday}, {leaf.date}
              </span>
              <span className="block text-[0.9375rem] text-muted">{days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}</span>
            </p>
            <ul className="py-2 pr-5">
              {entries.map(({ row, date }) => (
                <li key={`${row.id}:${date.key}`} className="item block leading-snug">
                  <Link href={hrefOf(row)} className="title-link block py-1">
                    <span className={`block font-semibold ${date.key === "due" && days < 7 ? "text-due" : ""}`}>
                      {date.label}
                      {fmtTimeOf(date.when) ? `, ${fmtTimeOf(date.when)}` : ""}
                      {date.key === "prebid" ? (date.mandatory ? " (mandatory)" : " (optional)") : ""}
                    </span>
                    <span className="block text-muted">{row.doc.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
