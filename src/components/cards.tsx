import Link from "next/link";
import { fmtWhen } from "@/lib/calendar";
import { fmtEstimate } from "@/lib/fit";
import { nextDate } from "@/lib/keydates";
import type { Row } from "@/server/queries";
import { ReasonList, Stamp, StatusChip, VerdictChip } from "./ui";

export const hrefOf = (row: Row) => `/solicitations/${row.id}`;

/** "Cedar Bench School District, Cedar Bench, 18 miles" and the estimate if one was given. */
export function Whereabouts({ row }: { row: Row }) {
  const estimate = row.eff.facts.estimated_value?.value;
  return (
    <p className="text-muted">
      {row.doc.agency}. {row.feed.place}, {row.feed.miles} miles.{estimate ? ` Estimated at ${fmtEstimate(estimate)}.` : ""}
    </p>
  );
}

/** A solicitation nobody has decided on yet, with the fit rules' verdict and why. */
export function MatchCard({ row, day }: { row: Row; day: number }) {
  const fine = row.fit.reasons.filter((reason) => reason.level === "ok").map((reason) => reason.label.toLowerCase());
  const rest = row.fit.reasons.filter((reason) => reason.level !== "ok");
  return (
    <li className="panel flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <VerdictChip verdict={row.fit.verdict} />
          {row.foundToday && <span className="rounded bg-ink px-2 py-0.5 text-sm font-bold text-white">Found this morning</span>}
          <span className="text-sm text-muted">
            {row.doc.type}, {row.doc.number}
          </span>
        </p>
        <h3 className="mt-2 text-xl font-extrabold leading-snug tracking-tight">
          <Link href={hrefOf(row)} className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-accent">
            {row.doc.title}
          </Link>
        </h3>
        <div className="mt-1">
          <Whereabouts row={row} />
        </div>
        <div className="mt-3 space-y-2">
          {rest.length > 0 && <ReasonList reasons={rest} />}
          {fine.length > 0 && (
            <p className="text-sm text-muted">
              {rest.length > 0 ? "Fine on" : "Passes every rule"}: {fine.join(", ")}.
            </p>
          )}
        </div>
      </div>
      <Stamp due={row.eff.facts.due?.value} day={day} />
    </li>
  );
}

/** A solicitation already in the pipeline: where it stands and what comes next. */
export function PipelineCard({ row, day }: { row: Row; day: number }) {
  const next = nextDate(row.eff.facts, day);
  const done = row.eff.checklist.filter((item) => row.checked.includes(item.id)).length;
  const total = row.eff.checklist.length;
  return (
    <li className="panel flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <StatusChip status={row.status} />
          {row.unseen.length > 0 && <span className="rounded bg-due px-2 py-0.5 text-sm font-bold text-white">Addendum {row.unseen.at(-1)!.number} to read</span>}
          <span className="text-sm text-muted">
            {row.doc.type}, {row.doc.number}
          </span>
        </p>
        <h3 className="mt-2 text-xl font-extrabold leading-snug tracking-tight">
          <Link href={hrefOf(row)} className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-accent">
            {row.doc.title}
          </Link>
        </h3>
        <div className="mt-1">
          <Whereabouts row={row} />
        </div>
        {row.status === "bidding" && (
          <div className="mt-3 max-w-sm">
            <p className="text-sm font-semibold">
              {done} of {total} things on the checklist done
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper" role="presentation">
              <div className="h-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
        {row.status === "passed" && row.reason && <p className="mt-3 text-sm">Passed because: {row.reason}</p>}
        {(row.status === "bidding" || row.status === "watching") && next && next.key !== "due" && (
          <p className="mt-3 text-sm">
            <strong className="font-bold">Next: </strong>
            {next.label.toLowerCase()}
            {next.mandatory ? " (mandatory)" : ""}, {fmtWhen(next.when)}
          </p>
        )}
      </div>
      {row.status !== "passed" && <Stamp due={row.eff.facts.due?.value} day={day} />}
    </li>
  );
}
