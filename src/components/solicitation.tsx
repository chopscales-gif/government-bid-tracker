"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import type { SolicitationDoc } from "@/data/documents";
import { ZONE, countdown, daysUntil, fmtShortDay, fmtWhen, isPast, stampParts } from "@/lib/calendar";
import type { Addendum, ChecklistItem, EffectiveFacts, Source } from "@/lib/effective";
import { VERDICT_LABEL, fmtEstimateFact } from "@/lib/fit";
import { dueLabel, keyDates } from "@/lib/keydates";
import { CERT_OPTIONS } from "@/lib/profile";
import { acknowledgeAction, passAction, reopenBidAction, resultAction, startBidAction, submitAction, tickAction, watchAction } from "@/server/actions";
import type { Row } from "@/server/queries";
import { ActionButton } from "./action-button";
import { fitNote } from "./cards";
import { ReasonList, Stepper, verdictText } from "./ui";

type Props = { row: Row; day: number; documents: SolicitationDoc[]; events: { id: number; day: number; text: string }[] };
type Tab = "needs" | "fit" | "dates" | "notes" | "changes" | "text";

const sameSource = (a: Source | null, b: Source) => a !== null && a.doc === b.doc && a.section === b.section && a.quote === b.quote;

const SET_ASIDE_LABEL: Record<string, string> = { none: "Open to all bidders", other: "Restricted. Read the section.", ...Object.fromEntries(CERT_OPTIONS.map((cert) => [cert.code, `Set aside: ${cert.label.toLowerCase()}`])) };

/** The first sentence of the AI's summary, and whatever follows it. */
function split(summary: string): [string, string] {
  const first = summary.match(/^[\s\S]*?[a-z0-9)]\.(?=\s+[A-Z])/)?.[0] ?? summary;
  return [first, summary.slice(first.length).trim()];
}

/**
 * One solicitation: what it is, the decision, the four facts that decide it,
 * and then one part at a time. Choosing anything the AI read shows the words
 * it was read from, beside it.
 */
export function Solicitation({ row, day, documents, events }: Props) {
  const [selected, setSelected] = useState<Source | null>(null);
  const [more, setMore] = useState(false);
  // An addendum nobody has read is the reason to be here, so it is what opens.
  const [tab, setTab] = useState<Tab>(row.unseen.length > 0 ? "changes" : "needs");
  const { eff, doc } = row;
  const facts = eff.facts;
  const due = facts.due?.value;
  const closed = due ? isPast(due, day) : false;
  const soon = due !== undefined && !closed && daysUntil(due, day) < 7;
  const names = new Map(documents.map((document, index) => [document.key, index === 0 ? "the solicitation" : `Addendum ${index}`]));
  const toggle = (source: Source) => setSelected((current) => (sameSource(current, source) ? null : source));
  const show = (next: Tab) => {
    setTab(next);
    setSelected(null);
  };

  /** Anything that can show where the solicitation says it. On a narrow screen the words appear beneath it instead. */
  const sourced: Sourced = (source, children, tour) => {
    const on = sameSource(selected, source);
    return (
      <>
        <button type="button" className="sourced" aria-pressed={on} data-tour={tour} onClick={() => toggle(source)}>
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
  const [sentence, rest] = split(eff.summary);
  const passes = row.fit.reasons.length;
  const settled = eff.addenda.reduce((count, addendum) => count + addendum.settles.length, 0);
  const tabs: { id: Tab; label: string; tour?: string }[] = [
    ...(eff.addenda.length > 0 ? [{ id: "changes" as const, label: eff.addenda.length === 1 ? `Addendum ${eff.addenda[0].number}` : "Addenda" }] : []),
    { id: "needs", label: "What the bid needs" },
    { id: "fit", label: "Does it fit", tour: "tab-fit" },
    { id: "dates", label: "Dates" },
    ...(eff.notes.length + settled > 0 ? [{ id: "notes" as const, label: "Worth reading twice" }] : []),
    { id: "text", label: "Full text" },
  ];
  // The words are beside the list on a wide screen. On the full text there is nothing to be beside.
  const beside = selected !== null && tab !== "text";

  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5 pb-20">
      <header className="pt-4 sm:pt-6">
        <p>
          <Link href={row.status === "new" ? "/" : "/pipeline"} className="inline-flex min-h-11 items-center font-medium text-muted hover:text-ink">
            {row.status === "new" ? "← Today" : "← Pipeline"}
          </Link>
        </p>
        <h1 className="display mt-1 max-w-[20em]">{doc.title}</h1>
        <p className="mt-4 max-w-[46rem] text-lg leading-relaxed text-muted">
          {sentence}{" "}
          {more && rest}{" "}
          {rest && (
            <button type="button" className="quiet text-base" aria-expanded={more} onClick={() => setMore(!more)}>
              {more ? "Show less" : "Read the summary"}
            </button>
          )}
        </p>
        {more && (
          <p className="mt-2 max-w-[46rem] text-[0.9375rem] text-muted">
            {doc.type}, {doc.number}. Read by AI, recorded for this demo.
            {eff.addenda.length > 0 && (
              <span className="font-semibold text-due">
                {" "}
                That summary is of the solicitation as first issued. {eff.addenda.length === 1 ? `Addendum ${eff.addenda[0].number} has` : `${eff.addenda.length} addenda have`} changed it since; everything below is up to date.
              </span>
            )}
          </p>
        )}
      </header>

      <Decide row={row} closed={closed} />

      <dl className="facts mt-7" data-tour="facts">
        <div>
          <dt>{dueLabel(doc.type)}</dt>
          {due ? (
            <>
              <dd className={soon ? "text-due" : ""}>
                {stampParts(due).date}, {countdown(due, day).toLowerCase()}
              </dd>
              <dd className={`!text-[0.9375rem] !font-normal ${soon ? "text-due" : "text-muted"}`}>
                {stampParts(due).time}
                {facts.due?.addendum != null && <span className="block font-semibold text-due">Changed by Addendum {facts.due.addendum}</span>}
              </dd>
            </>
          ) : (
            <dd className="text-muted">Not found</dd>
          )}
        </div>
        <div>
          <dt>Estimate</dt>
          <dd>{facts.estimated_value ? fmtEstimateFact(facts.estimated_value) : "Not stated"}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{row.feed.miles} miles</dd>
          <dd className="!text-[0.9375rem] !font-normal text-muted">{row.feed.place}</dd>
        </div>
        <div>
          <dt>Fit</dt>
          <dd className={verdictText(row.fit.verdict)}>{row.fit.verdict === "good" ? `Passes all ${passes} rules` : VERDICT_LABEL[row.fit.verdict]}</dd>
          {row.fit.verdict !== "good" && <dd className="!text-[0.9375rem] !font-normal text-muted">{fitNote(row)}</dd>}
        </div>
      </dl>

      <div role="tablist" aria-label="Parts of this solicitation" className="tabs mt-9">
        {tabs.map((each) => (
          <button key={each.id} type="button" role="tab" id={`tab-${each.id}`} aria-selected={tab === each.id} aria-controls="part" data-tour={each.tour} onClick={() => show(each.id)}>
            {each.id === "changes" && unseen.size > 0 && <span aria-hidden className="mr-2 inline-block size-2 -translate-y-px rounded-full bg-due" />}
            {each.label}
          </button>
        ))}
      </div>

      <div className={`mt-4 grid items-start gap-5 ${beside ? "lg:grid-cols-2" : ""}`} data-tour="split">
        <div role="tabpanel" id="part" aria-labelledby={`tab-${tab}`} className={tab === "text" ? "min-w-0" : "panel min-w-0 px-5 py-4 sm:px-7 sm:py-5"}>
          {tab === "changes" &&
            eff.addenda.map((addendum) => (
              <AddendumPanel key={addendum.key} addendum={addendum} day={day} sourced={sourced} unread={unseen.has(addendum.key)}>
                {unseen.has(addendum.key) && (
                  <ActionButton action={() => acknowledgeAction(row.id)} pendingLabel="Saving" className="mt-4">
                    Got it
                  </ActionButton>
                )}
              </AddendumPanel>
            ))}

          {tab === "needs" && (
            <>
              <Checklist row={row} sourced={sourced} />
              {eff.afterAward.length > 0 && (
                <details open={row.status === "won"} className={`mt-2 border-t border-line pt-2 ${row.status === "won" ? "-mx-3 rounded-xl border-0 bg-good-tint px-3 pb-2" : ""}`}>
                  <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{row.status === "won" ? "You won it. What the agency needs next" : "If you win"}</summary>
                  <ul>
                    {eff.afterAward.map((item, index) => (
                      <li key={index}>{sourced(item.source, item.text)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          {tab === "fit" && (
            <div>
              <div data-tour="fit">
                <p className="pt-1 pb-2 text-[0.9375rem] text-muted">
                  Written rules, not AI, against your{" "}
                  <Link href="/profile" className="quiet">
                    company profile
                  </Link>
                  .
                </p>
                <ReasonList reasons={row.fit.reasons} />
              </div>
              <h2 className="subheading mt-6 border-t border-line pt-5">The essentials</h2>
              <ul className="mt-1">
                {essentials.map((entry) => {
                  const body = (
                    <span className="grid gap-x-4 sm:grid-cols-[10rem_1fr]">
                      <span className="text-muted">{entry.label}</span>
                      <span>
                        <span className={entry.source ? "font-semibold" : "text-muted"}>{entry.value}</span>
                        {entry.addendum !== null && <span className="block text-sm font-medium text-due">Changed by Addendum {entry.addendum}</span>}
                      </span>
                    </span>
                  );
                  return <li key={entry.label}>{entry.source ? sourced(entry.source, body) : <div className="py-2">{body}</div>}</li>;
                })}
              </ul>
            </div>
          )}

          {tab === "dates" &&
            (dates.length ? (
              <>
                <ul>
                  {dates.map((date) => {
                    const past = isPast(date.when, day);
                    return (
                      <li key={date.key}>
                        {sourced(
                          date.source,
                          <span className="grid gap-x-4 sm:grid-cols-[12rem_1fr]">
                            <span className="text-muted">
                              {date.label}
                              {date.key === "prebid" && <span className={date.mandatory ? "font-semibold text-due" : ""}>{date.mandatory ? ", mandatory" : ", optional"}</span>}
                            </span>
                            <span>
                              <span className={past ? "text-muted" : "font-semibold"}>
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
                <p className="pt-2 pb-1 text-[0.9375rem] text-muted">Times are local to the agency: {ZONE.name}.</p>
              </>
            ) : (
              <p className="py-2 text-muted">The reading found no dates in this solicitation.</p>
            ))}

          {tab === "notes" && (
            <>
              <p className="pt-1 pb-2 text-[0.9375rem] text-muted">What the AI flagged while reading: contradictions, unusual conditions, and places it had to choose how to read something.</p>
              <ul>
                {eff.addenda.flatMap((addendum) =>
                  addendum.settles.map((note, index) => (
                    <li key={`${addendum.key}:${index}`}>
                      {sourced(
                        { doc: note.doc, section: note.section, quote: "" },
                        <>
                          <span className="font-semibold text-due">Settled by Addendum {addendum.number}. </span>
                          {note.text}
                        </>,
                      )}
                    </li>
                  )),
                )}
                {eff.notes.map((note, index) => (
                  <li key={index}>{sourced({ doc: note.doc, section: note.section, quote: "" }, note.text)}</li>
                ))}
              </ul>
            </>
          )}

          {tab === "text" && <DocumentPane documents={documents} selected={null} />}
        </div>

        {beside && <DocumentPane documents={documents} selected={selected} onClose={() => setSelected(null)} />}
      </div>

      <details className="mt-9">
        <summary className="quiet inline-flex min-h-11 items-center">History</summary>
        <ol className="panel mt-2 px-5 py-3 sm:px-7">
          {events.map((event) => (
            <li key={event.id} className="item grid gap-x-4 sm:grid-cols-[7rem_1fr]">
              <span className="text-muted">{fmtShortDay(event.day)}</span>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      </details>
    </main>
  );
}

type Sourced = (source: Source, children: React.ReactNode, tour?: string) => React.ReactNode;

/** What an addendum changed, each line with what it said before and what holds now. */
function AddendumPanel({ addendum, day, sourced, unread = false, children }: { addendum: Addendum; day: number; sourced: Sourced; unread?: boolean; children?: React.ReactNode }) {
  return (
    <section className="border-line py-2 not-first:mt-3 not-first:border-t not-first:pt-5" aria-label={`Addendum ${addendum.number}`}>
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
                <span className="text-muted">{change.what}</span>
                <span>
                  <span className="block text-muted line-through decoration-due/60">
                    <span className="sr-only">Before: </span>
                    {change.before}
                  </span>
                  <span className="block font-semibold">
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
          <h3 className="mt-3 font-semibold">It also settles</h3>
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
  return `${lead} See the essentials under Does it fit for what holds now.`;
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
    <section aria-label="What the bid needs" data-tour="needs">
      <p className="flex flex-wrap items-baseline justify-between gap-x-4 pt-1 pb-2 text-[0.9375rem] text-muted">
        <span>Read by AI, recorded for this demo. Click a line to see where the solicitation says so.</span>
        {tracked && (
          <span className="font-semibold text-accent-deep tabular-nums">
            {done} of {items.length} done
          </span>
        )}
      </p>
      <ul>
        {items.map((item, index) => {
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
                    {item.addendum !== null && <span className="font-semibold text-due"> Added by Addendum {item.addendum}.</span>}
                  </>,
                  index === 0 ? "line" : undefined,
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
      ? "Not decided yet"
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
    <section className="mt-7" aria-labelledby="decide" data-tour="decide">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Stepper status={status} />
        <h2 id="decide" className="subheading">
          {heading}
        </h2>
      </div>
      {status === "passed" && row.reason && <p className="mt-1">Because: {row.reason}</p>}
      {status === "new" && row.fit.verdict === "no" && <p className="mt-1 text-sm text-muted">The rules say this is not a fit. You can still bid: you may know something the rules do not.</p>}
      {status === "bidding" && <p className="mt-1 text-sm text-muted">Tick things off as they are done. The bid cannot be marked as handed in while anything is missing or an addendum is unread.</p>}
      {status === "submitted" && !closed && <p className="mt-1 text-sm text-muted">If an addendum arrives before the deadline you can take the bid back and change it.</p>}
      {closed && (status === "new" || status === "watching" || status === "bidding" || status === "passed") && <p className="mt-1 font-semibold">The deadline has passed.</p>}

      {passing ? (
        <PassForm id={id} onClose={() => setPassing(false)} />
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {!closed && (status === "new" || status === "watching" || status === "passed") && (
            <ActionButton action={() => startBidAction(id)} pendingLabel="Saving" className="contents">
              {status === "passed" ? "Bid after all" : "Bid on this"}
            </ActionButton>
          )}
          {!closed && (status === "new" || status === "passed") && (
            <ActionButton action={() => watchAction(id)} pendingLabel="Saving" className="contents" variant="quiet">
              {status === "passed" ? "Watch it again" : "Watch it"}
            </ActionButton>
          )}
          {!closed && status === "bidding" && (
            <ActionButton action={() => submitAction(id)} pendingLabel="Checking" className="contents">
              Mark the bid as handed in
            </ActionButton>
          )}
          {status === "submitted" && (
            <>
              <ActionButton action={() => resultAction({ id, result: "won" })} pendingLabel="Saving" className="contents">
                We won it
              </ActionButton>
              <ActionButton action={() => resultAction({ id, result: "lost" })} pendingLabel="Saving" className="contents" variant="quiet">
                It went to someone else
              </ActionButton>
              {!closed && (
                <ActionButton action={() => reopenBidAction(id)} pendingLabel="Saving" className="contents" variant="quiet">
                  Take the bid back to change it
                </ActionButton>
              )}
            </>
          )}
          {canPass && (
            <button type="button" className="btn btn-quiet" onClick={() => setPassing(true)}>
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
function DocumentPane({ documents, selected, onClose }: { documents: SolicitationDoc[]; selected: Source | null; onClose?: () => void }) {
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
    <aside ref={pane} aria-label="The solicitation" className={`panel min-w-0 ${onClose ? "max-lg:hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto" : ""}`}>
      {onClose && (
        <p className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-[1.25rem] border-b border-line bg-surface px-5 py-2 sm:px-7">
          <span className="font-semibold">Where it says so</span>
          <button type="button" className="quiet min-h-11" onClick={onClose}>
            Close
          </button>
        </p>
      )}
      {documents.map((document, index) => (
        <article key={document.key} className={`typed px-5 py-6 sm:px-7 sm:py-7 ${index > 0 ? "border-t-2 border-dashed border-edge" : ""}`}>
          <p className="font-sans text-[0.9375rem] text-muted">
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
