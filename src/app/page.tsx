import Image from "next/image";
import Link from "next/link";
import { DeskCalendar, EntryHead, MatchCard, hrefOf } from "@/components/cards";
import { ReasonList, Stamp, StatusChip } from "@/components/ui";
import { fmtLongDay, fmtShortDay } from "@/lib/calendar";
import { dueLabel } from "@/lib/keydates";
import { board, type Row } from "@/server/queries";
import { getCtx } from "@/server/session";

const ACTIVE = ["watching", "bidding", "submitted"];

export default async function Today() {
  const { day, rows } = await board(await getCtx());

  const changed = rows.filter((row) => row.unseen.length > 0 && ACTIVE.includes(row.status));
  const fresh = rows.filter((row) => row.status === "new");
  const matches = fresh.filter((row) => row.fit.verdict !== "no").sort((a, b) => Number(b.foundToday) - Number(a.foundToday));
  const filtered = fresh.filter((row) => row.fit.verdict === "no");
  const foundToday = rows.filter((row) => row.foundToday).length;
  const addendaToday = rows.reduce((count, row) => count + row.eff.addenda.filter((addendum) => addendum.day === day).length, 0);
  const found = [
    foundToday ? `${foundToday} new ${foundToday === 1 ? "solicitation" : "solicitations"}` : null,
    addendaToday ? `${addendaToday === 1 ? "an addendum" : `${addendaToday} addenda`} to something you are following` : null,
  ].filter(Boolean);

  const bidding = rows.filter((row) => row.status === "bidding").length;
  const headline = [
    foundToday ? `${foundToday} new ${foundToday === 1 ? "solicitation" : "solicitations"}` : null,
    addendaToday ? (addendaToday === 1 ? "one addendum" : `${addendaToday} addenda`) : null,
  ].filter(Boolean);
  const figures = [
    { label: "Changed since you looked", value: changed.length, href: "#changed", tone: changed.length ? "text-due" : "" },
    { label: "Waiting for a decision", value: matches.length, href: "#matches", tone: "" },
    { label: "Bids under way", value: bidding, href: "/pipeline", tone: "" },
  ];

  return (
    <main className="flex-1">
      {/* The morning's news, over a photograph of the desk it lands on. */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <Image src="/photos/desk.jpg" alt="" fill preload sizes="100vw" className="-z-20 object-cover object-[50%_38%]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(250_248_243/0.96)_0%,rgb(250_248_243/0.86)_40%,rgb(250_248_243/0.22)_100%)] max-lg:bg-[linear-gradient(180deg,rgb(250_248_243/0.8)_0%,rgb(250_248_243/0.86)_100%)]" />
        <div className="mx-auto w-full max-w-[86rem] px-4 pt-10 pb-10 sm:px-6 lg:px-8 lg:pt-16 lg:pb-14">
          <p className="eyebrow">Today at the bid desk</p>
          <h1 className="display mt-3">
            {fmtLongDay(day)}
            <span className="accent">{headline.length ? `${capital(headline.join(" and "))} this morning.` : "Nothing new this morning."}</span>
          </h1>
          <p className="mt-5 max-w-[40rem] text-lg leading-relaxed">
            {found.length ? `This morning's check of the agency feeds found ${found.join(" and ")}.` : "This morning's check of the agency feeds found nothing new."}{" "}
            {foundToday ? `${foundToday === 1 ? "It was" : "Each one was"} read by AI and compared with your company profile.` : ""}
          </p>
          <ul className="mt-8 grid max-w-[44rem] grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-lift">
            {figures.map((figure) => (
              <li key={figure.label} className="contents">
                <Link href={figure.href} className="grid content-between gap-3 bg-surface/95 px-4 py-4 hover:bg-surface sm:px-5">
                  <span className="text-[0.9375rem] leading-snug font-medium text-muted">{figure.label}</span>
                  <span className={`text-[2.5rem] leading-none font-bold tracking-[-0.04em] tabular-nums ${figure.tone}`}>{figure.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* One column on a phone, in reading order. On a laptop the guide and the calendar stand beside the rows. */}
      <div className="mx-auto flex w-full max-w-[86rem] flex-col gap-12 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10 lg:px-8 lg:py-12 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-12">
        <div className="contents lg:block lg:space-y-14">
          {changed.length > 0 && (
            <section aria-labelledby="changed" className="order-2 scroll-mt-6">
              <h2 id="changed" className="heading">
                Changed since you last looked
              </h2>
              <ul className="mt-4 space-y-4">
                {changed.map((row) => (
                  <ChangedCard key={row.id} row={row} day={day} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="matches" className="order-4 scroll-mt-6">
            <h2 id="matches" className="heading">
              Waiting for a decision
            </h2>
            <p className="mt-1.5 text-muted">Solicitations the rules say you could bid. Open one to read it, then watch it, bid or pass.</p>
            {matches.length > 0 ? (
              <div className="mt-5">
                <EntryHead last="How it fits" />
                <ul className="grid gap-3.5">
                  {matches.map((row) => (
                    <MatchCard key={row.id} row={row} day={day} />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="panel mt-4 p-6 text-muted">Nothing is waiting. Everything that fits has been decided, and it is all in the pipeline.</p>
            )}
          </section>

          {filtered.length > 0 && (
            <section aria-labelledby="filtered" className="order-5">
              <h2 id="filtered" className="heading">
                Filtered out
              </h2>
              <p className="mt-1.5 max-w-[44rem] text-muted">
                Found and read, but a rule says they are not for you. The reason is shown so you can check the rule was right. Changing your{" "}
                <Link href="/profile" className="link">
                  company profile
                </Link>{" "}
                changes what lands here.
              </p>
              <ul className="mt-5 overflow-hidden rounded-[1.25rem] border border-line bg-stone/50">
                {filtered.map((row) => (
                  <li key={row.id} className="grid gap-x-8 border-line px-5 pb-4 not-first:border-t md:grid-cols-2 md:items-center md:px-7 md:pb-0">
                    <p className="leading-snug">
                      <Link href={hrefOf(row)} className="title-link block pt-4 pb-1 text-lg font-semibold tracking-[-0.01em]">
                        {row.doc.title}
                      </Link>
                      <span className="block text-[0.9375rem] text-muted md:pb-4">{row.doc.agency}</span>
                    </p>
                    <div className="text-[0.9375rem] max-md:mt-2">
                      <ReasonList reasons={row.fit.reasons} only={["block"]} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="contents lg:block lg:space-y-10">
          <div className="order-1">
            <Guide day={day} rows={rows} />
          </div>
          <div className="order-3">
            <DeskCalendar rows={rows} day={day} />
          </div>
        </div>
      </div>
    </main>
  );
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A bid or a watched solicitation that an addendum has changed, with what it said before and what it says now. */
function ChangedCard({ row, day }: { row: Row; day: number }) {
  return (
    <li className="overflow-hidden rounded-[1.25rem] border border-[#f5cdb6] bg-surface shadow-lift">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-due-tint to-[#fff7f1] p-5 sm:flex-row sm:gap-6 sm:px-7 sm:py-6">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="tag bg-due text-white">Changed by an addendum</span>
            <StatusChip status={row.status} />
          </p>
          <h3 className="heading mt-3">{row.doc.title}</h3>
          <p className="mt-1 text-muted">{row.doc.agency}</p>
        </div>
        <Stamp due={row.eff.facts.due?.value} day={day} label={dueLabel(row.doc.type)} className="entry-stamp" />
      </div>
      {row.unseen.map((addendum) => (
        <div key={addendum.key} className="border-t border-line p-5 sm:px-7 sm:py-6">
          <p className="text-lg font-bold tracking-[-0.01em] text-due">
            Addendum {addendum.number}, found {addendum.day === day ? "this morning" : fmtShortDay(addendum.day)}
          </p>
          <p className="mt-1.5 max-w-[44rem] leading-relaxed">{addendum.summary}</p>
          <dl className="mt-4 border-t border-line">
            {addendum.changes.slice(0, 3).map((change) => (
              <div key={change.what} className="grid gap-x-6 gap-y-1 border-b border-line py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <dt className="font-semibold text-muted">{change.what}</dt>
                <dd>
                  <p className="text-muted line-through decoration-due/60">
                    <span className="sr-only">Before: </span>
                    {change.before}
                  </p>
                  <p className="font-bold">
                    <span className="sr-only">Now: </span>
                    {change.after}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
          {addendum.changes.length > 3 && (
            <p className="mt-3 text-sm text-muted">
              And {addendum.changes.length - 3} more {addendum.changes.length - 3 === 1 ? "change" : "changes"}, listed when you open it.
            </p>
          )}
        </div>
      ))}
      <div className="border-t border-line p-5 sm:px-7">
        <Link href={hrefOf(row)} className="btn btn-primary w-full sm:w-auto">
          Open it and see where it says so
        </Link>
      </div>
    </li>
  );
}

/**
 * The three things worth doing first. It follows the demo calendar, so each step names what is on the screen now.
 * It is tinted apart from the rows because it belongs to the demo, not to the contractor's product.
 */
function Guide({ day, rows }: { day: number; rows: Row[] }) {
  const boiler = rows.find((row) => row.key === "boiler");
  const sample = rows.find((row) => row.key === "rtu");
  const link = "link";
  const step = "grid grid-cols-[2.5rem_minmax(0,1fr)] px-5 py-4 leading-snug";
  const number = "grid size-7 place-items-center rounded-full bg-surface text-sm font-bold text-accent-deep shadow-rest";
  return (
    <section aria-labelledby="guide" className="rounded-[1.25rem] border border-[#d9d4fb] bg-gradient-to-b from-accent-tint to-[#f6f5ff]">
      <h2 id="guide" className="subheading px-5 pt-5 pb-2">
        New to this demo? Three things to try
      </h2>
      <ol className="divide-y divide-[#dcd8fb]">
        <li className={step}>
          <span aria-hidden className={number}>
            1
          </span>
          <span>
            <strong className="font-bold">See where it says so.</strong>{" "}
            {sample ? (
              <>
                Open the{" "}
                <Link href={hrefOf(sample)} className={link}>
                  rooftop unit job
                </Link>{" "}
                and click anything on its checklist. The words it was read from light up in the solicitation.
              </>
            ) : (
              "Open any solicitation and click anything on its checklist. The words it was read from light up in the solicitation."
            )}
          </span>
        </li>
        <li className={step}>
          <span aria-hidden className={number}>
            2
          </span>
          <span>
            <strong className="font-bold">Catch an addendum.</strong>{" "}
            {day === 0 || !boiler ? (
              <>
                Press <em>Skip to next morning</em> in the bar at the top. Overnight, a school district changes a bid you have already started.
              </>
            ) : (
              <>
                An addendum moved the deadline on the{" "}
                <Link href={hrefOf(boiler)} className={link}>
                  boiler bid
                </Link>{" "}
                and added a bond.{" "}
                {boiler.status === "bidding"
                  ? "Open it, then try to hand the bid in."
                  : "The bid could not be marked as handed in until the addendum had been read and the bond ticked off."}
              </>
            )}
          </span>
        </li>
        <li className={step}>
          <span aria-hidden className={number}>
            3
          </span>
          <span>
            <strong className="font-bold">Change what fits.</strong> In{" "}
            <Link href="/profile" className={link}>
              Company profile
            </Link>
            , widen how far you travel or add a certification. The list beside the form shows which jobs come out differently before you save.
          </span>
        </li>
      </ol>
    </section>
  );
}
