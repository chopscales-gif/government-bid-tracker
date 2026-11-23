"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import type { SolicitationDoc } from "@/data/documents";
import { ZONE, fmtShortDay, fmtWhen, isPast } from "@/lib/calendar";
import type { Addendum, ChecklistItem, EffectiveFacts, Source } from "@/lib/effective";
import { fmtEstimateFact } from "@/lib/fit";
import { dueLabel, keyDates } from "@/lib/keydates";
import { CERT_OPTIONS } from "@/lib/profile";
import { acknowledgeAction, passAction, reopenBidAction, resultAction, startBidAction, submitAction, tickAction, watchAction } from "@/server/actions";
import type { Row } from "@/server/queries";
import { ActionButton } from "./action-button";
import { ReasonList, Stamp, StatusChip, Stepper, VerdictChip } from "./ui";

type Props = { row: Row; day: number; documents: SolicitationDoc[]; events: { id: number; day: number; text: string }[] };

const sameSource = (a: Source | null, b: Source) => a !== null && a.doc === b.doc && a.section === b.section && a.quote === b.quote;

const SET_ASIDE_LABEL: Record<string, string> = { none: "Open to all bidders", other: "Restricted. Read the section.", ...Object.fromEntries(CERT_OPTIONS.map((cert) => [cert.code, `Set aside: ${cert.label.toLowerCase()}`])) };

/**
 * One solicitation: what the AI read from it on the left, the solicitation
 * itself on the right. Choosing anything on the left shows the words it was
 * read from.
 */
export function Solicitation({ row, day, documents, events }: Props) {
  const [selected, setSelected] = useState<Source | null>(null);
  const { eff, doc } = row;
  const facts = eff.facts;
  const due = facts.due?.value;
  const closed = due ? isPast(due, day) : false;
  const names = new Map(documents.map((document, index) => [document.key, index === 0 ? "the solicitation" : `Addendum ${index}`]));
  const toggle = (source: Source) => setSelected((current) => (sameSource(current, source) ? null : source));

  /** Anything that can show where the solicitation says it. Under the wide layout the words appear beneath it instead. */
  const sourced = (source: Source, children: React.ReactNode, className = "") => {
    const on = sameSource(selected, source);
    return (
      <>
        <button type="button" className={`sourced ${className}`} aria-pressed={on} onClick={() => toggle(source)}>
          {children}
        </button>
        {on && (
          <p className="typed mt-1.5 mb-2 rounded-xl bg-stone px-3.5 py-2.5 text-sm leading-snug lg:hidden">
            {source.quote ? <>&ldquo;{source.quote}&rdquo; </> : null}
            <span className="font-sans text-muted">
              {source.quote ? "From" : "See"} {source.section}, {names.get(source.doc)}.
            </span>
          </p>
        )}
      </>
    );
  };

  const dates = keyDates(facts, doc.type);
  const essentials: { label: string; value: string; source: Source | null; addendum: number | null }[] = [
    { label: "Estimate", value: facts.estimated_value ? fmtEstimateFact(facts.estimated_value) : "Not stated", source: facts.estimated_value?.source ?? null, addendum: facts.estimated_value?.addendum ?? null },
    { label: "Who may bid", value: facts.set_aside ? SET_ASIDE_LABEL[facts.set_aside.value] : "Not stated", source: facts.set_aside?.source ?? null, addendum: facts.set_aside?.addendum ?? null },
    { label: "Work type", value: facts.naics ? `NAICS ${facts.naics.value}` : "No NAICS code stated", source: facts.naics?.source ?? null, addendum: facts.naics?.addendum ?? null },
    {
      label: "License",
      value: facts.licences?.value.codes.length ? facts.licences.value.codes.join(facts.licences.value.need === "any" ? " or " : " and ") : "None named",
      source: facts.licences?.source ?? null,
      addendum: facts.licences?.addendum ?? null,
    },
    { label: "Bid security", value: facts.bid_bond ? facts.bid_bond.value.detail : "Not stated", source: facts.bid_bond?.source ?? null, addendum: facts.bid_bond?.addendum ?? null },
    { label: "Bonds if you win", value: facts.performance_bond ? facts.performance_bond.value.detail : "Not stated", source: facts.performance_bond?.source ?? null, addendum: facts.performance_bond?.addendum ?? null },
    { label: "How to hand it in", value: facts.submission ? facts.submission.value : "Not stated", source: facts.submission?.source ?? null, addendum: facts.submission?.addendum ?? null },
  ];

  const unseen = new Set(row.unseen.map((addendum) => addendum.key));

  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <p>
        <Link href={row.status === "new" ? "/" : "/pipeline"} className="link inline-flex min-h-11 items-center">
          {row.status === "new" ? "Back to Today" : "Back to the pipeline"}
        </Link>
      </p>
      <header className="mt-2 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="chip">
              {doc.type}, {doc.number}
            </span>
            <StatusChip status={row.status} />
            {(row.status === "new" || row.status === "watching" || row.status === "passed") && <VerdictChip verdict={row.fit.verdict} />}
          </p>
          <h1 className="display mt-4 max-w-[22em] lg:text-[2.75rem]">{doc.title}</h1>
          <p className="mt-3 text-lg text-muted">
            {doc.agency}. {row.feed.place}, {row.feed.miles} miles from the yard.
          </p>
          <div className="mt-6 empty:hidden">
            <Stepper status={row.status} labels />
          </div>
        </div>
        <Stamp due={due} day={day} label={dueLabel(doc.type)} struck className="sm:mt-1" />
      </header>

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-6">
          {eff.addenda
            .filter((addendum) => unseen.has(addendum.key))
            .map((addendum) => (
              <AddendumPanel key={addendum.key} addendum={addendum} day={day} sourced={sourced} unread>
                <ActionButton action={() => acknowledgeAction(row.id)} pendingLabel="Saving" className="mt-4">
                  Got it
                </ActionButton>
              </AddendumPanel>
            ))}

          <Decide row={row} closed={closed} />

          <div className="panel">
          <section className="sec" aria-labelledby="summary">
            <h2 id="summary" className="subheading">
              What it is
            </h2>
            <p className="mt-2 leading-relaxed">{eff.summary}</p>
            {eff.addenda.length > 0 && (
              <p className="mt-3 rounded-xl bg-due-tint px-3.5 py-2.5 text-sm font-semibold text-due">
                That summary is of the solicitation as first issued. {eff.addenda.length === 1 ? `Addendum ${eff.addenda[0].number} has` : `${eff.addenda.length} addenda have`} changed it since. The dates, checklist and essentials below are up to
                date.
              </p>
            )}
            <p className="mt-3 text-sm text-muted">
              Read by AI, recorded for this demo. Click any item below to see the words it came from{" "}
              <span className="hidden lg:inline">in the solicitation on the right.</span>
              <span className="lg:hidden">in the solicitation.</span>
            </p>
          </section>

          <section className="sec" aria-labelledby="dates">
            <h2 id="dates" className="subheading">
              Dates to keep
            </h2>
            {dates.length ? (
              <ul className="mt-2">
                {dates.map((date) => {
                  const past = isPast(date.when, day);
                  return (
                    <li key={date.key}>
                      {sourced(
                        date.source,
                        <span className="grid gap-x-4 sm:grid-cols-[10rem_1fr]">
                          <span className="font-semibold text-muted">
                            {date.label}
                            {date.key === "prebid" && <br className="hidden sm:inline" />}
                            {date.key === "prebid" && (
                              <span className={`tag ml-2 text-xs sm:mt-1 sm:ml-0 ${date.mandatory ? "bg-due-tint text-due" : "bg-stone text-muted"}`}>{date.mandatory ? "Mandatory" : "Optional"}</span>
                            )}
                          </span>
                          <span>
                            <span className={past ? "text-muted" : "font-bold"}>
                              {fmtWhen(date.when)}
                              {past ? " (passed)" : ""}
                            </span>
                            {date.addendum !== null && (
                              <span className="block text-sm font-medium text-due">
                                Changed by Addendum {date.addendum}
                                {date.was && date.was !== date.when ? (
                                  <>
                                    . Was <span className="line-through">{fmtWhen(date.was)}</span>
                                  </>
                                ) : null}
                              </span>
                            )}
                          </span>
                        </span>,
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-muted">The reading found no dates in this solicitation.</p>
            )}
            {dates.length > 0 && <p className="mt-2 text-sm text-muted">Times are local to the agency: {ZONE.name}.</p>}
          </section>

          <Checklist row={row} sourced={sourced} />

          <section className="sec" aria-labelledby="fit">
            <h2 id="fit" className="subheading">
              Does it fit
            </h2>
            <p className="mt-1 text-sm text-muted">
              Written rules, not AI. Each compares the solicitation with your{" "}
              <Link href="/profile" className="link">
                company profile
              </Link>
              .
            </p>
            <div className="mt-3">
              <ReasonList reasons={row.fit.reasons} />
            </div>
          </section>

          <section className="sec" aria-labelledby="essentials">
            <h2 id="essentials" className="subheading">
              The essentials
            </h2>
            <ul className="mt-2">
              {essentials.map((entry) => {
                const body = (
                  <span className="grid gap-x-4 sm:grid-cols-[10rem_1fr]">
                    <span className="font-semibold text-muted">{entry.label}</span>
                    <span>
                      <span className={entry.source ? "font-bold" : "text-muted"}>{entry.value}</span>
                      {entry.addendum !== null && <span className="block text-sm font-medium text-due">Changed by Addendum {entry.addendum}</span>}
                    </span>
                  </span>
                );
                return <li key={entry.label}>{entry.source ? sourced(entry.source, body) : <div className="px-0 py-1.5">{body}</div>}</li>;
              })}
            </ul>
          </section>

          {eff.notes.length > 0 && (
            <section className="sec" aria-labelledby="notes">
              <h2 id="notes" className="subheading">
                Worth reading twice
              </h2>
              <p className="mt-1 text-sm text-muted">What the AI flagged while reading: contradictions, unusual conditions, and places it had to choose how to read something.</p>
              <ul className="mt-2">
                {eff.addenda.flatMap((addendum) =>
                  addendum.settles.map((note, index) => (
                    <li key={`${addendum.key}:${index}`}>
                      {sourced(
                        { doc: note.doc, section: note.section, quote: "" },
                        <>
                          <span className="tag mr-2 bg-due-tint text-xs text-due">Settled by Addendum {addendum.number}</span>
                          {note.text}
                        </>,
                      )}
                    </li>
                  )),
                )}
                {eff.notes.slice(0, 3).map((note, index) => (
                  <li key={index}>{sourced({ doc: note.doc, section: note.section, quote: "" }, note.text)}</li>
                ))}
              </ul>
              {eff.notes.length > 3 && (
                <details className="mt-1">
                  <summary className="link flex min-h-11 cursor-pointer items-center">{eff.notes.length - 3} more</summary>
                  <ul>
                    {eff.notes.slice(3).map((note, index) => (
                      <li key={index}>{sourced({ doc: note.doc, section: note.section, quote: "" }, note.text)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          {eff.afterAward.length > 0 && (
            <section className={`sec ${row.status === "won" ? "rounded-b-[1.25rem] bg-good-tint" : ""}`} aria-labelledby="after">
              <h2 id="after" className="subheading">
                {row.status === "won" ? "You won it. What the agency needs next" : "If you win"}
              </h2>
              <ul className="mt-2">
                {eff.afterAward.map((item, index) => (
                  <li key={index}>{sourced(item.source, item.text)}</li>
                ))}
              </ul>
            </section>
          )}
          </div>

          {eff.addenda
            .filter((addendum) => !unseen.has(addendum.key))
            .map((addendum) => (
              <AddendumPanel key={addendum.key} addendum={addendum} day={day} sourced={sourced} />
            ))}

          <section className="panel sec" aria-labelledby="history">
            <h2 id="history" className="subheading">
              History
            </h2>
            <ol className="mt-2 space-y-1.5">
              {events.map((event) => (
                <li key={event.id} className="grid gap-x-4 sm:grid-cols-[7rem_1fr]">
                  <span className="font-semibold text-muted">{fmtShortDay(event.day)}</span>
                  <span>{event.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <DocumentPane documents={documents} selected={selected} />
      </div>
    </main>
  );
}

type Sourced = (source: Source, children: React.ReactNode, className?: string) => React.ReactNode;

/** What an addendum changed, each line with what it said before and what holds now. */
function AddendumPanel({ addendum, day, sourced, unread = false, children }: { addendum: Addendum; day: number; sourced: Sourced; unread?: boolean; children?: React.ReactNode }) {
  return (
    <section className={`panel sec ${unread ? "border-[#f5cdb6] bg-gradient-to-b from-due-tint to-surface to-40% shadow-lift" : ""}`} aria-label={`Addendum ${addendum.number}`}>
      <h2 className={`subheading ${unread ? "text-due" : ""}`}>
        Addendum {addendum.number}, found {addendum.day === day ? "this morning" : fmtShortDay(addendum.day)}
      </h2>
      <p className="mt-2 leading-relaxed">{addendum.summary}</p>
      <ul className="mt-3">
        {addendum.changes.map((change) => (
          <li key={change.what}>
            {sourced(
              change.source,
              <span className="grid gap-x-4 sm:grid-cols-[10rem_1fr]">
                <span className="font-semibold text-muted">{change.what}</span>
                <span>
                  <span className="block text-muted line-through decoration-due/60">
                    <span className="sr-only">Before: </span>
                    {change.before}
                  </span>
                  <span className="block font-bold">
                    <span className="sr-only">Now: </span>
                    {change.after}
                  </span>
                </span>
              </span>,
            )}
          </li>
        ))}
      </ul>
      {addendum.settles.length > 0 && (
        <>
          <h3 className="mt-3 font-bold">It also settles</h3>
          <ul>
            {addendum.settles.map((note, index) => (
              <li key={index}>{sourced({ doc: note.doc, section: note.section, quote: "" }, note.text)}</li>
            ))}
          </ul>
        </>
      )}
      {children}
    </section>
  );
}

/** What to say under an original checklist item whose words an addendum has replaced. */
function changedNote(item: ChecklistItem, facts: EffectiveFacts): string {
  const { addendum, fact } = item.changed!;
  const lead = `Changed by Addendum ${addendum}.`;
  if (fact === "due" && facts.due) return `${lead} Now due ${fmtWhen(facts.due.value)}.`;
  if (fact === "questions_due" && facts.questions_due) return `${lead} Questions are now due ${fmtWhen(facts.questions_due.value)}.`;
  if (fact === "prebid" && facts.prebid) return `${lead} The meeting is now ${fmtWhen(facts.prebid.value.when)}${facts.prebid.value.mandatory ? " and is mandatory" : ""}.`;
  return `${lead} See the essentials below for what holds now.`;
}

/** Everything the bid needs. While a bid is under way each item can be ticked off. */
function Checklist({ row, sourced }: { row: Row; sourced: Sourced }) {
  const [checked, setOptimistic] = useOptimistic(row.checked, (current: string[], change: { item: string; done: boolean }) =>
    change.done ? [...current, change.item] : current.filter((id) => id !== change.item),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bidding = row.status === "bidding";
  const tracked = bidding || row.status === "submitted" || row.status === "won" || row.status === "lost";
  const items = row.eff.checklist;
  const done = items.filter((item) => checked.includes(item.id)).length;

  function tick(item: string, isDone: boolean) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ item, done: isDone });
      const result = await tickAction({ id: row.id, item, done: isDone });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="sec" aria-labelledby="checklist">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="checklist" className="subheading">
          What the bid needs
        </h2>
        {tracked && (
          <p className="tag bg-accent-tint text-accent-deep tabular-nums">
            {done} of {items.length} done
          </p>
        )}
      </div>
      {!tracked && <p className="mt-1 text-sm text-muted">Decide to bid and this becomes a checklist you tick off.</p>}
      <ul className="mt-2 space-y-0.5">
        {items.map((item) => {
          const isDone = checked.includes(item.id);
          return (
            <li key={item.id} className="flex items-start">
              {tracked ? (
                <label className={`-ml-3 flex size-11 flex-none items-center justify-center ${bidding ? "cursor-pointer" : ""}`}>
                  <input type="checkbox" checked={isDone} disabled={!bidding} onChange={(event) => tick(item.id, event.target.checked)} aria-label={`Done: ${item.text}`} className="size-5 accent-accent" />
                </label>
              ) : (
                <span aria-hidden className="mt-3 mr-3 size-5 flex-none rounded-md border-[1.5px] border-edge" />
              )}
              <div className="min-w-0 flex-1">
                {sourced(
                  item.source,
                  <>
                    <span className={isDone ? "text-muted" : ""}>{item.text}</span>
                    {item.addendum !== null && <span className="tag ml-2 bg-due-tint text-xs text-due">Added by Addendum {item.addendum}</span>}
                  </>,
                )}
                {item.changed && <p className="pb-1.5 text-sm font-semibold text-due">{changedNote(item, row.eff.facts)}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-flag">
          {error}
        </p>
      )}
    </section>
  );
}

/** The decision: watch, bid, pass, hand in, record the result. What is offered depends on where the solicitation stands. */
function Decide({ row, closed }: { row: Row; closed: boolean }) {
  const [passing, setPassing] = useState(false);
  const { status, id } = row;
  const canPass = status === "new" || status === "watching" || status === "bidding";

  const heading =
    status === "new"
      ? "Decide"
      : status === "watching"
        ? "You are watching this one"
        : status === "bidding"
          ? "You are bidding on this one"
          : status === "submitted"
            ? "Your bid is in"
            : status === "won"
              ? "Awarded to you"
              : status === "lost"
                ? "Awarded to another bidder"
                : "You passed on this one";

  return (
    <section className="sec rounded-[1.25rem] border border-[#d9d4fb] bg-gradient-to-b from-accent-tint to-surface to-55% shadow-lift" aria-labelledby="decide">
      <h2 id="decide" className="heading">
        {heading}
      </h2>
      {status === "passed" && row.reason && <p className="mt-1">Because: {row.reason}</p>}
      {status === "new" && row.fit.verdict === "no" && <p className="mt-1 text-sm text-muted">The rules say this is not a fit. You can still bid: you may know something the rules do not.</p>}
      {status === "bidding" && <p className="mt-1 text-sm text-muted">Tick things off below as they are done. The bid cannot be marked as handed in while anything is missing or an addendum is unread.</p>}
      {status === "submitted" && !closed && <p className="mt-1 text-sm text-muted">If an addendum arrives before the deadline you can take the bid back and change it.</p>}
      {closed && (status === "new" || status === "watching" || status === "bidding" || status === "passed") && <p className="mt-1 font-semibold">The deadline has passed.</p>}

      {passing ? (
        <PassForm id={id} onClose={() => setPassing(false)} />
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {!closed && (status === "new" || status === "watching" || status === "passed") && (
            <ActionButton action={() => startBidAction(id)} pendingLabel="Saving">
              {status === "passed" ? "Bid after all" : "Bid on this"}
            </ActionButton>
          )}
          {!closed && (status === "new" || status === "passed") && (
            <ActionButton action={() => watchAction(id)} pendingLabel="Saving" variant="quiet">
              {status === "passed" ? "Watch it again" : "Watch it"}
            </ActionButton>
          )}
          {!closed && status === "bidding" && (
            <ActionButton action={() => submitAction(id)} pendingLabel="Checking">
              Mark the bid as handed in
            </ActionButton>
          )}
          {status === "submitted" && (
            <>
              <ActionButton action={() => resultAction({ id, result: "won" })} pendingLabel="Saving">
                We won it
              </ActionButton>
              <ActionButton action={() => resultAction({ id, result: "lost" })} pendingLabel="Saving" variant="quiet">
                It went to someone else
              </ActionButton>
              {!closed && (
                <ActionButton action={() => reopenBidAction(id)} pendingLabel="Saving" variant="quiet">
                  Take the bid back to change it
                </ActionButton>
              )}
            </>
          )}
          {canPass && (
            <button type="button" className="btn btn-quiet w-full sm:w-auto" onClick={() => setPassing(true)}>
              Pass
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function PassForm({ id, onClose }: { id: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await passAction({ id, reason });
      if (!result.ok) setError(result.error);
      else onClose();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3">
      <label htmlFor="pass-reason" className="font-semibold">
        Why are you passing?
      </label>
      <p className="text-sm text-muted">One line is enough. It is kept with the solicitation, so nobody has to work it out again.</p>
      <input id="pass-reason" className="field mt-2" value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} autoFocus />
      {error && (
        <p role="alert" className="mt-2 text-sm text-flag">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          {pending ? "Saving" : "Pass on it"}
        </button>
        <button type="button" className="btn btn-quiet w-full sm:w-auto" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/**
 * The solicitation as issued, with any addenda after it. The section an item
 * was read from is outlined, and the exact words are marked when the reading
 * quoted them.
 */
function DocumentPane({ documents, selected }: { documents: SolicitationDoc[]; selected: Source | null }) {
  const pane = useRef<HTMLElement | null>(null);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // On a narrow screen the words are shown under the item instead, and the page stays where it is.
    if (!selected || !target.current || !pane.current || !window.matchMedia("(min-width: 1024px)").matches) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Scroll the document inside its own pane, so the item that was clicked stays where it is.
    const box = pane.current.getBoundingClientRect();
    const at = target.current.getBoundingClientRect();
    // Only the part of the pane that is on screen counts, or the words can land below the fold.
    const seenTop = Math.max(box.top, 0);
    const seen = Math.min(box.bottom, window.innerHeight) - seenTop;
    const top = pane.current.scrollTop + at.top - seenTop - (seen - at.height) / 2;
    pane.current.scrollTo({ top, behavior: calm ? "auto" : "smooth" });
    // The pane can run out of room to scroll while its foot is still below the screen. Move the page the rest of the way.
    const most = pane.current.scrollHeight - pane.current.clientHeight;
    const lands = at.bottom - (Math.min(Math.max(top, 0), most) - pane.current.scrollTop);
    const short = lands - (window.innerHeight - 96);
    if (short > 0) window.scrollBy({ top: short, behavior: calm ? "auto" : "smooth" });
  }, [selected]);

  return (
    <aside ref={pane} aria-label="The solicitation" className="panel min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
      {documents.map((document, index) => (
        <article key={document.key} className={`typed px-5 py-7 sm:px-9 sm:py-9 ${index > 0 ? "border-t-2 border-dashed border-edge" : ""}`}>
          <p className="chip font-sans">
            {index === 0 ? "The solicitation as issued" : `Addendum ${index}`}. {document.agency}, {document.number}. Issued {document.issued}.
          </p>
          <h2 className="mt-4 text-lg leading-snug font-medium">{document.title}</h2>
          {document.sections.map((section) => {
            const here = selected !== null && selected.doc === document.key && selected.section === section.heading;
            // The first line that holds the quoted words. With no quote, or none found, the whole section is the answer.
            const at = here && selected.quote ? section.lines.findIndex((line) => line.includes(selected.quote)) : -1;
            return (
              <section
                key={section.heading}
                ref={here && at < 0 ? target : undefined}
                className={`-mx-3 mt-4 rounded-xl px-3 py-2 ${here ? "bg-accent-tint/70 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]" : ""}`}
              >
                <h3 className="font-medium text-accent-deep">{section.heading}</h3>
                {section.lines.map((line, lineIndex) => {
                  if (lineIndex !== at) {
                    return (
                      <p key={lineIndex} className="mt-2">
                        {line}
                      </p>
                    );
                  }
                  const start = line.indexOf(selected!.quote);
                  return (
                    <p key={lineIndex} className="mt-2">
                      {line.slice(0, start)}
                      <mark ref={target} className="mark">
                        {selected!.quote}
                      </mark>
                      {line.slice(start + selected!.quote.length)}
                    </p>
                  );
                })}
              </section>
            );
          })}
        </article>
      ))}
    </aside>
  );
}
