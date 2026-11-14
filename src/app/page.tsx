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

  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="display">{fmtLongDay(day)}</h1>
      <p className="mt-3 max-w-[44rem] text-lg leading-relaxed">
        {found.length ? `This morning's check of the agency feeds found ${found.join(" and ")}.` : "This morning's check of the agency feeds found nothing new."}{" "}
        {foundToday ? `${foundToday === 1 ? "It was" : "Each one was"} read by AI and compared with your company profile.` : ""}
      </p>

      {/* One column on a phone, in reading order. On a laptop the guide and the calendar stand beside the register. */}
      <div className="mt-8 flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-10">
        <div className="contents lg:block lg:space-y-10">
          {changed.length > 0 && (
            <section aria-labelledby="changed" className="order-2">
              <h2 id="changed" className="heading">
                Changed since you last looked
              </h2>
              <ul className="mt-3 space-y-4">
                {changed.map((row) => (
                  <ChangedCard key={row.id} row={row} day={day} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="matches" className="order-4">
            <h2 id="matches" className="heading">
              Waiting for a decision
            </h2>
            <p className="mt-1 text-muted">Solicitations the rules say you could bid. Open one to read it, then watch it, bid or pass.</p>
            {matches.length > 0 ? (
              <div className="panel mt-3">
                <EntryHead last="How it fits" />
                <ul>
                  {matches.map((row) => (
                    <MatchCard key={row.id} row={row} day={day} />
                  ))}
                </ul>
              </div>
            ) : (
              <p className="panel mt-3 p-5">Nothing is waiting. Everything that fits has been decided, and it is all in the pipeline.</p>
            )}
          </section>

          {filtered.length > 0 && (
            <section aria-labelledby="filtered" className="order-5">
              <h2 id="filtered" className="heading">
                Filtered out
              </h2>
              <p className="mt-1 max-w-[44rem] text-muted">
                Found and read, but a rule says they are not for you. The reason is shown so you can check the rule was right. Changing your{" "}
                <Link href="/profile" className="link">
                  company profile
                </Link>{" "}
                changes what lands here.
              </p>
              <ul className="mt-3 border-y border-edge">
                {filtered.map((row) => (
                  <li key={row.id} className="grid gap-x-8 border-edge pb-3.5 not-first:border-t md:grid-cols-2 md:items-center md:pb-0">
                    <p className="leading-snug">
                      <Link href={hrefOf(row)} className="title-link narrow block pt-3.5 pb-1.5 text-lg font-bold">
                        {row.doc.title}
                      </Link>
                      <span className="block text-[0.9375rem] text-muted md:pb-3.5">{row.doc.agency}</span>
                    </p>
                    <div className="text-[0.9375rem]">
                      <ReasonList reasons={row.fit.reasons} only={["block"]} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="contents lg:block lg:space-y-8">
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

/** A bid or a watched solicitation that an addendum has changed, with what it said before and what it says now. */
function ChangedCard({ row, day }: { row: Row; day: number }) {
  return (
    <li className="panel border-2 border-due">
      <div className="flex gap-4 p-4 sm:gap-6 sm:p-5">
        <div className="min-w-0 flex-1">
          <StatusChip status={row.status} />
          <h3 className="subheading mt-2 sm:text-2xl">{row.doc.title}</h3>
          <p className="mt-1 text-muted">{row.doc.agency}</p>
        </div>
        <Stamp due={row.eff.facts.due?.value} day={day} label={dueLabel(row.doc.type)} />
      </div>
      {row.unseen.map((addendum) => (
        <div key={addendum.key} className="border-t border-line p-4 sm:p-5">
          <p className="narrow text-lg font-extrabold text-due">
            Addendum {addendum.number}, found {addendum.day === day ? "this morning" : fmtShortDay(addendum.day)}
          </p>
          <p className="mt-1 max-w-[44rem] leading-relaxed">{addendum.summary}</p>
          <dl className="mt-4 border-t border-line">
            {addendum.changes.slice(0, 3).map((change) => (
              <div key={change.what} className="grid gap-x-6 gap-y-1 border-b border-line py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <dt className="font-bold">{change.what}</dt>
                <dd>
                  <p className="text-muted line-through decoration-due">
                    <span className="sr-only">Before: </span>
                    {change.before}
                  </p>
                  <p className="font-semibold">
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
      <div className="border-t border-line p-4 sm:p-5">
        <Link href={hrefOf(row)} className="btn btn-primary w-full sm:w-auto">
          Open it and see where it says so
        </Link>
      </div>
    </li>
  );
}

/**
 * The three things worth doing first. It follows the demo calendar, so each step names what is on the screen now.
 * It is dressed like the demo bar because it belongs to the demo, not to the contractor's product.
 */
function Guide({ day, rows }: { day: number; rows: Row[] }) {
  const boiler = rows.find((row) => row.key === "boiler");
  const sample = rows.find((row) => row.key === "rtu");
  const link = "link";
  const step = "grid grid-cols-[1.75rem_minmax(0,1fr)] px-4 py-3 leading-snug";
  const number = "narrow text-xl leading-none font-extrabold";
  return (
    <section aria-labelledby="guide" className="rounded-[2px] border-2 border-ink bg-surface">
      <h2 id="guide" className="narrow bg-ink px-4 py-2 text-lg font-bold text-white">
        New to this demo? Three things to try
      </h2>
      <ol className="divide-y divide-line">
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
