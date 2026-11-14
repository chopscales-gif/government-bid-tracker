import Link from "next/link";
import { daysUntil, fmtTimeOf, fmtWhen, isPast, leafParts } from "@/lib/calendar";
import { fmtEstimateFact } from "@/lib/fit";
import { dueLabel, keyDates, nextDate, type KeyDate } from "@/lib/keydates";
import type { Row } from "@/server/queries";
import { ReasonList, Stamp, StatusChip, VerdictChip } from "./ui";

export const hrefOf = (row: Row) => `/solicitations/${row.id}`;

/** "Cedar Bench School District, Cedar Bench, 18 miles" and the estimate if one was given. */
export function Whereabouts({ row }: { row: Row }) {
  const estimate = row.eff.facts.estimated_value;
  return (
    <p className="text-muted">
      {row.doc.agency}. {row.feed.place}, {row.feed.miles} miles.{estimate ? ` Estimated at ${fmtEstimateFact(estimate)}.` : ""}
    </p>
  );
}

/** The column headings of a register. Only shown where the entries sit in columns. */
export function EntryHead({ last }: { last: string }) {
  return (
    <div className="entry-head text-muted" aria-hidden>
      <span>Due</span>
      <span>Solicitation</span>
      <span>{last}</span>
    </div>
  );
}

function EntryTitle({ row }: { row: Row }) {
  return (
    <>
      <h3 className="subheading">
        <Link href={hrefOf(row)} className="title-link">
          {row.doc.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-muted">
        {row.doc.type}, {row.doc.number}
      </p>
      <div className="mt-0.5">
        <Whereabouts row={row} />
      </div>
    </>
  );
}

/** A solicitation nobody has decided on yet, with the fit rules' verdict and why. */
export function MatchCard({ row, day }: { row: Row; day: number }) {
  const fine = row.fit.reasons.filter((reason) => reason.level === "ok").map((reason) => reason.label.toLowerCase());
  const rest = row.fit.reasons.filter((reason) => reason.level !== "ok");
  return (
    <li className="entry">
      <div className="entry-body">
        {row.foundToday && <p className="mb-1.5 text-sm font-bold text-accent-deep">Found this morning</p>}
        <EntryTitle row={row} />
      </div>
      <Stamp due={row.eff.facts.due?.value} day={day} label={dueLabel(row.doc.type)} className="entry-stamp" />
      <div className="entry-aside space-y-2">
        <p>
          <VerdictChip verdict={row.fit.verdict} />
        </p>
        {rest.length > 0 && (
          <div className="text-[0.9375rem]">
            <ReasonList reasons={rest} />
          </div>
        )}
        {fine.length > 0 && (
          <p className="text-sm leading-snug text-muted">
            {rest.length > 0 ? "Fine on" : "Passes every rule"}: {fine.join(", ")}.
          </p>
        )}
      </div>
    </li>
  );
}

/** A solicitation already in the pipeline: where it stands and what comes next. */
export function PipelineCard({ row, day }: { row: Row; day: number }) {
  const next = nextDate(row.eff.facts, day);
  const done = row.eff.checklist.filter((item) => row.checked.includes(item.id)).length;
  const total = row.eff.checklist.length;
  const due = row.eff.facts.due?.value;
  const missed = due !== undefined && isPast(due, day) && (row.status === "bidding" || row.status === "watching");
  return (
    <li className="entry">
      <div className="entry-body">
        <EntryTitle row={row} />
      </div>
      {row.status !== "passed" ? <Stamp due={due} day={day} label={dueLabel(row.doc.type)} className="entry-stamp" /> : <span className="entry-stamp" />}
      <div className="entry-aside space-y-2">
        <p className="flex flex-wrap items-center gap-2">
          <StatusChip status={row.status} />
          {row.unseen.length > 0 && <span className="tag border-due bg-due text-white">Addendum {row.unseen.at(-1)!.number} to read</span>}
        </p>
        {row.status === "bidding" && (
          <div className="max-w-sm">
            <p className="text-sm font-semibold">
              {done} of {total} things on the checklist done
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-[1px] border border-ink bg-surface" role="presentation">
              <div className="h-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
        {missed && <p className="text-sm font-semibold text-flag">{row.status === "bidding" ? "The deadline passed before this bid was handed in." : "The deadline has passed."}</p>}
        {row.status === "passed" && row.reason && <p className="text-sm">Passed because: {row.reason}</p>}
        {(row.status === "bidding" || row.status === "watching") && next && next.key !== "due" && (
          <p className="text-sm">
            <strong className="font-bold">Next: </strong>
            {next.label.toLowerCase()}
            {next.mandatory ? " (mandatory)" : ""}, {fmtWhen(next.when)}
          </p>
        )}
      </div>
    </li>
  );
}

const HORIZON = 14;

/**
 * The desk calendar: every date still ahead, in the next two weeks, on the
 * bids being worked and the solicitations being watched. A deadline inside a
 * week is in red, the same as its stamp.
 */
export function DeskCalendar({ rows, day }: { rows: Row[]; day: number }) {
  const dates = rows
    .filter((row) => row.status === "bidding" || row.status === "watching")
    .flatMap((row) => keyDates(row.eff.facts, row.doc.type).map((date) => ({ row, date })))
    .filter(({ date }) => !isPast(date.when, day) && daysUntil(date.when, day) <= HORIZON)
    .sort((a, b) => a.date.when.localeCompare(b.date.when));
  const leaves = new Map<string, { row: Row; date: KeyDate }[]>();
  for (const entry of dates) leaves.set(entry.date.when.slice(0, 10), [...(leaves.get(entry.date.when.slice(0, 10)) ?? []), entry]);

  return (
    <section aria-labelledby="desk-calendar">
      <h2 id="desk-calendar" className="heading">
        Dates in the next two weeks
      </h2>
      <p className="mt-1 text-sm text-muted">On the bids you are working and the solicitations you are watching.</p>
      {leaves.size === 0 ? (
        <p className="panel mt-3 p-4">Nothing you are following has a date in the next two weeks.</p>
      ) : (
        <ol className="panel mt-3">
          {[...leaves].map(([iso, entries]) => {
            const leaf = leafParts(iso);
            const days = daysUntil(iso, day);
            return (
              <li key={iso} className="grid grid-cols-[5rem_minmax(0,1fr)] border-line not-first:border-t">
                <p className="border-r border-line px-2 py-3 text-center leading-none">
                  <span className="block text-sm font-bold">{leaf.weekday}</span>
                  <span className="narrow mt-1 block text-lg font-extrabold whitespace-nowrap">{leaf.date}</span>
                  <span className="mt-1 block text-xs text-muted">{days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}</span>
                </p>
                <ul className="divide-y divide-line">
                  {entries.map(({ row, date }) => {
                    const isDue = date.key === "due";
                    return (
                      <li key={`${row.id}:${date.key}`} className="px-3 py-2.5 leading-snug">
                        <p className={`font-bold ${isDue && days < 7 ? "text-due" : ""}`}>
                          {date.label}
                          {fmtTimeOf(date.when) ? `, ${fmtTimeOf(date.when)}` : ""}
                          {date.key === "prebid" ? (date.mandatory ? " (mandatory)" : " (optional)") : ""}
                        </p>
                        <p className="text-[0.9375rem]">
                          <Link href={hrefOf(row)} className="title-link block py-1">
                            {row.doc.title}
                          </Link>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
