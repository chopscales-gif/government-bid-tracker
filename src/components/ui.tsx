import type { Status } from "@/db/schema";
import { VERDICT_LABEL, type Level, type Reason, type Verdict } from "@/lib/fit";

const VERDICT_TONE: Record<Verdict, { text: string; dot: string }> = {
  good: { text: "text-good", dot: "bg-good" },
  check: { text: "text-amber", dot: "bg-[#e09a1c]" },
  no: { text: "text-flag", dot: "bg-flag" },
};

/** A coloured dot and a few words: the one verdict a row or a fact carries. */
export function Signal({ dot, className = "", children, note }: { dot: string; className?: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <span className={`flex items-baseline gap-2 leading-snug font-semibold ${className}`}>
      <span aria-hidden className={`size-2.5 flex-none -translate-y-px rounded-full ${dot}`} />
      <span className="min-w-0">
        {children}
        {note && <span className="block text-[0.9375rem] font-normal text-muted">{note}</span>}
      </span>
    </span>
  );
}

/** The fit rules' verdict: green fits, amber needs a look, red does not. */
export function VerdictMark({ verdict, note }: { verdict: Verdict; note?: React.ReactNode }) {
  const tone = VERDICT_TONE[verdict];
  return (
    <Signal dot={tone.dot} className={tone.text} note={note}>
      {VERDICT_LABEL[verdict]}
    </Signal>
  );
}

export const verdictText = (verdict: Verdict) => VERDICT_TONE[verdict].text;

export const STATUS_LABEL: Record<Status, string> = { new: "Not reviewed", watching: "Watching", bidding: "Bidding", submitted: "Bid handed in", won: "Won", lost: "Lost", passed: "Passed" };

const STATUS_TONE: Record<Status, { text: string; dot: string }> = {
  new: { text: "text-muted", dot: "bg-faint" },
  watching: { text: "text-sky", dot: "bg-sky" },
  bidding: { text: "text-accent-deep", dot: "bg-accent" },
  submitted: { text: "text-ink", dot: "bg-ink" },
  won: { text: "text-good", dot: "bg-good" },
  lost: { text: "text-muted", dot: "bg-faint" },
  passed: { text: "text-muted", dot: "bg-faint" },
};

/** Where a solicitation stands, in its own colour. */
export function StatusMark({ status, note }: { status: Status; note?: React.ReactNode }) {
  const tone = STATUS_TONE[status];
  return (
    <Signal dot={tone.dot} className={tone.text} note={note}>
      {STATUS_LABEL[status]}
    </Signal>
  );
}

const STEPS = ["Found", "Watching", "Bidding", "Handed in", "Decided"];
const STEP_OF: Record<Status, number> = { new: 0, watching: 1, bidding: 2, submitted: 3, won: 4, lost: 4, passed: -1 };

/** How far a solicitation has come, as five dots. A solicitation that was passed on has left the line and shows none. */
export function Stepper({ status }: { status: Status }) {
  const at = STEP_OF[status];
  if (at < 0) return null;
  return (
    <ol role="img" aria-label={`Stage ${at + 1} of ${STEPS.length}: ${STATUS_LABEL[status]}`} className="flex w-[7.5rem] flex-none">
      {STEPS.map((step, index) => (
        <li key={step} aria-hidden className="relative flex flex-1 justify-center">
          {index < STEPS.length - 1 && <span className={`absolute top-[0.3125rem] left-1/2 h-0.5 w-full ${index < at ? "bg-accent" : "bg-line"}`} />}
          <span className={`relative size-3 rounded-full ${index < at ? "bg-accent" : index === at ? "bg-accent shadow-[0_0_0_4px_var(--color-accent-tint)]" : "border-2 border-edge bg-surface"}`} />
        </li>
      ))}
    </ol>
  );
}

/** The top of a page: one sentence in two tones, what it is in black and what it means today in grey. */
export function PageHeader({ title, accent, back }: { title: string; accent?: string; back?: React.ReactNode }) {
  return (
    <header className="pt-7 pb-8 sm:pt-12 sm:pb-10">
      {back && <p className="-mt-3 mb-3 sm:-mt-6">{back}</p>}
      <h1 className="display">
        {title}
        {accent && <span className="accent"> {accent}</span>}
      </h1>
    </header>
  );
}

const LEVEL_MARK: Record<Level, { sign: string; word: string; style: string }> = {
  ok: { sign: "✓", word: "Fine", style: "text-good" },
  caution: { sign: "!", word: "Check", style: "text-amber" },
  block: { sign: "✕", word: "Stops you", style: "text-flag" },
};

/** The fit rules' reasons, one ruled line each. */
export function ReasonList({ reasons, only }: { reasons: Reason[]; only?: Level[] }) {
  const shown = only ? reasons.filter((reason) => only.includes(reason.level)) : reasons;
  return (
    <ul>
      {shown.map((reason) => {
        const mark = LEVEL_MARK[reason.level];
        return (
          <li key={reason.key} className="item leading-snug">
            <span aria-hidden className={`w-5 flex-none text-center font-extrabold ${mark.style}`}>
              {mark.sign}
            </span>
            <span>
              <span className="sr-only">{mark.word}: </span>
              <strong className="font-semibold">{reason.label}.</strong> {reason.detail}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
