import type { Status } from "@/db/schema";
import { countdown, daysUntil, isPast, stampParts } from "@/lib/calendar";
import { VERDICT_LABEL, type Level, type Reason, type Verdict } from "@/lib/fit";

const VERDICT_STYLE: Record<Verdict, string> = { good: "bg-good-tint text-good", check: "bg-amber-tint text-amber", no: "bg-flag-tint text-flag" };

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-sm font-bold ${VERDICT_STYLE[verdict]}`}>{VERDICT_LABEL[verdict]}</span>;
}

export const STATUS_LABEL: Record<Status, string> = { new: "Not reviewed", watching: "Watching", bidding: "Bidding", submitted: "Bid handed in", won: "Won", lost: "Lost", passed: "Passed" };

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-paper text-muted",
  watching: "bg-accent-tint text-accent-deep",
  bidding: "bg-accent text-white",
  submitted: "bg-ink text-white",
  won: "bg-good-tint text-good",
  lost: "bg-paper text-muted",
  passed: "bg-paper text-muted",
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-sm font-bold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** The date a bid is due and how long is left, set like a clerk's date stamp. */
export function Stamp({ due, day, label = "Bids due" }: { due: string | undefined; day: number; label?: string }) {
  if (!due) {
    return (
      <div className="stamp" data-tone="closed">
        <span className="stamp-label">{label}</span>
        <span className="stamp-date">?</span>
        <span className="stamp-time">no date found</span>
      </div>
    );
  }
  const parts = stampParts(due);
  const tone = isPast(due, day) ? "closed" : daysUntil(due, day) < 7 ? "soon" : "open";
  return (
    <div className="stamp" data-tone={tone}>
      <span className="stamp-label">{label}</span>
      <span className="stamp-date">{parts.date}</span>
      <span className="stamp-time">{parts.time}</span>
      <span className="stamp-left">{countdown(due, day)}</span>
    </div>
  );
}

const LEVEL_MARK: Record<Level, { sign: string; word: string; style: string }> = {
  ok: { sign: "✓", word: "Fine", style: "bg-good-tint text-good" },
  caution: { sign: "!", word: "Check", style: "bg-amber-tint text-amber" },
  block: { sign: "✕", word: "Stops you", style: "bg-flag-tint text-flag" },
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
            <span aria-hidden className={`mt-0.5 inline-flex size-5 flex-none items-center justify-center rounded-full text-xs font-extrabold ${mark.style}`}>
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
