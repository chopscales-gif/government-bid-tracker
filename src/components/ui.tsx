import { Fragment } from "react";
import type { Status } from "@/db/schema";
import { countdown, daysUntil, isPast, stampParts } from "@/lib/calendar";
import { VERDICT_LABEL, type Level, type Reason, type Verdict } from "@/lib/fit";

const VERDICT_MARK: Record<Verdict, { sign: string; box: string; text: string }> = {
  good: { sign: "✓", box: "bg-good", text: "text-good" },
  check: { sign: "!", box: "bg-amber", text: "text-amber" },
  no: { sign: "✕", box: "bg-flag", text: "text-flag" },
};

/** The fit rules' verdict, set like a ticked box on a form. */
export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const mark = VERDICT_MARK[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${mark.text}`}>
      <span aria-hidden className={`inline-flex size-[1.125rem] flex-none items-center justify-center rounded-[2px] text-xs font-extrabold text-white ${mark.box}`}>
        {mark.sign}
      </span>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

export const STATUS_LABEL: Record<Status, string> = { new: "Not reviewed", watching: "Watching", bidding: "Bidding", submitted: "Bid handed in", won: "Won", lost: "Lost", passed: "Passed" };

const STATUS_STYLE: Record<Status, string> = {
  new: "border-muted text-muted",
  watching: "border-accent bg-accent-tint text-accent-deep",
  bidding: "border-ink bg-ink text-white",
  submitted: "border-ink bg-surface text-ink",
  won: "border-good bg-good text-white",
  lost: "border-muted text-muted",
  passed: "border-muted text-muted",
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`tag ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** The date a bid is due and how long is left, set like a clerk's date stamp. */
export function Stamp({ due, day, label = "Bids due", struck = false, className = "" }: { due: string | undefined; day: number; label?: string; struck?: boolean; className?: string }) {
  const cls = `stamp ${struck ? "stamp-struck" : ""} ${className}`;
  if (!due) {
    return (
      <div className={cls} data-tone="closed">
        <span className="stamp-label">{label}</span>
        <span className="stamp-date">?</span>
        <span className="stamp-time">no date found</span>
      </div>
    );
  }
  const parts = stampParts(due);
  const tone = isPast(due, day) ? "closed" : daysUntil(due, day) < 7 ? "soon" : "open";
  return (
    <div className={cls} data-tone={tone}>
      <span className="stamp-label">{label}</span>
      <span className="stamp-date">{parts.date}</span>
      <span className="stamp-time">
        {/* If the line has to break on a phone it breaks after the weekday, never inside the time. */}
        {parts.time.split(", ").map((piece, index, all) => (
          <Fragment key={piece}>
            <span className="whitespace-nowrap">{index < all.length - 1 ? `${piece},` : piece}</span>
            {index < all.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </span>
      <span className="stamp-left">{countdown(due, day)}</span>
    </div>
  );
}

const LEVEL_MARK: Record<Level, { sign: string; word: string; style: string }> = {
  ok: { sign: "✓", word: "Fine", style: "bg-good text-white" },
  caution: { sign: "!", word: "Check", style: "bg-amber text-white" },
  block: { sign: "✕", word: "Stops you", style: "bg-flag text-white" },
};

/** The fit rules' reasons, one line each. */
export function ReasonList({ reasons, only }: { reasons: Reason[]; only?: Level[] }) {
  const shown = only ? reasons.filter((reason) => only.includes(reason.level)) : reasons;
  return (
    <ul className="space-y-1.5">
      {shown.map((reason) => {
        const mark = LEVEL_MARK[reason.level];
        return (
          <li key={reason.key} className="flex gap-2 leading-snug">
            <span aria-hidden className={`mt-0.5 inline-flex size-[1.125rem] flex-none items-center justify-center rounded-[2px] text-xs font-extrabold ${mark.style}`}>
              {mark.sign}
            </span>
            <span>
              <span className="sr-only">{mark.word}: </span>
              <strong className="font-bold">{reason.label}.</strong> {reason.detail}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
