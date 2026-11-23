import { Fragment } from "react";
import type { Status } from "@/db/schema";
import { countdown, daysUntil, isPast, stampParts } from "@/lib/calendar";
import { VERDICT_LABEL, type Level, type Reason, type Verdict } from "@/lib/fit";

const VERDICT_MARK: Record<Verdict, { sign: string; chip: string; dot: string }> = {
  good: { sign: "✓", chip: "bg-good-tint text-good", dot: "bg-good" },
  check: { sign: "!", chip: "bg-amber-tint text-amber", dot: "bg-amber" },
  no: { sign: "✕", chip: "bg-flag-tint text-flag", dot: "bg-flag" },
};

/** The fit rules' verdict: green fits, amber needs a look, red does not. */
export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const mark = VERDICT_MARK[verdict];
  return (
    <span className={`tag ${mark.chip}`}>
      <span aria-hidden className={`inline-flex size-4 flex-none items-center justify-center rounded-full text-[0.625rem] font-extrabold text-white ${mark.dot}`}>
        {mark.sign}
      </span>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

export const STATUS_LABEL: Record<Status, string> = { new: "Not reviewed", watching: "Watching", bidding: "Bidding", submitted: "Bid handed in", won: "Won", lost: "Lost", passed: "Passed" };

const STATUS_STYLE: Record<Status, string> = {
  new: "bg-stone text-muted",
  watching: "bg-accent-tint text-accent-deep",
  bidding: "bg-accent text-white",
  submitted: "bg-sky-tint text-sky",
  won: "bg-good-tint text-good",
  lost: "bg-stone text-muted",
  passed: "bg-stone text-muted",
};

export function StatusChip({ status }: { status: Status }) {
  return <span className={`tag ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

const STEPS = ["Found", "Watching", "Bidding", "Handed in", "Decided"];
const STEP_OF: Record<Status, number> = { new: 0, watching: 1, bidding: 2, submitted: 3, won: 4, lost: 4, passed: -1 };

/** How far a solicitation has come, as five dots. A solicitation that was passed on has left the line and shows none. */
export function Stepper({ status, labels = false }: { status: Status; labels?: boolean }) {
  const at = STEP_OF[status];
  if (at < 0) return null;
  return (
    <ol role="img" aria-label={`Stage ${at + 1} of ${STEPS.length}: ${STATUS_LABEL[status]}`} className={`flex ${labels ? "w-full max-w-[30rem]" : "w-[9.5rem]"}`}>
      {STEPS.map((step, index) => (
        <li key={step} aria-hidden className="relative flex flex-1 flex-col items-center gap-1.5">
          {index < STEPS.length - 1 && <span className={`absolute top-[0.3125rem] left-1/2 h-0.5 w-full ${index < at ? "bg-accent" : "bg-line"}`} />}
          <span
            className={`relative size-3 rounded-full ${index < at ? "bg-accent" : index === at ? "bg-accent shadow-[0_0_0_4px_var(--color-accent-tint)]" : "border-2 border-edge bg-surface"}`}
          />
          {labels && <span className={`text-[0.8125rem] leading-tight whitespace-nowrap max-sm:hidden ${index === at ? "font-bold text-accent-deep" : "text-muted"}`}>{step}</span>}
        </li>
      ))}
    </ol>
  );
}

/** The top of a page: a headline in two tones and a line of explanation. */
export function PageHeader({ title, accent, children }: { title: string; accent?: string; children?: React.ReactNode }) {
  return (
    <header className="pt-2 pb-8 lg:pt-4 lg:pb-10">
      <h1 className="display">
        {title}
        {accent && <span className="accent">{accent}</span>}
      </h1>
      {children && <p className="mt-4 max-w-[44rem] text-lg leading-relaxed text-muted">{children}</p>}
    </header>
  );
}

/** The date a bid is due and how long is left, as a tile that turns orange inside the last week. */
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
  ok: { sign: "✓", word: "Fine", style: "bg-good-tint text-good" },
  caution: { sign: "!", word: "Check", style: "bg-amber-tint text-amber" },
  block: { sign: "✕", word: "Stops you", style: "bg-flag-tint text-flag" },
};

/** The fit rules' reasons, one line each. */
export function ReasonList({ reasons, only }: { reasons: Reason[]; only?: Level[] }) {
  const shown = only ? reasons.filter((reason) => only.includes(reason.level)) : reasons;
  return (
    <ul className="space-y-2">
      {shown.map((reason) => {
        const mark = LEVEL_MARK[reason.level];
        return (
          <li key={reason.key} className="flex gap-2.5 leading-snug">
            <span aria-hidden className={`mt-px inline-flex size-5 flex-none items-center justify-center rounded-full text-[0.6875rem] font-extrabold ${mark.style}`}>
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
