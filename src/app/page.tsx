import Link from "next/link";
import { MatchCard, hrefOf } from "@/components/cards";
import { ReasonList, Stamp, StatusChip } from "@/components/ui";
import { daysUntil, fmtLongDay, fmtShortDay, isPast } from "@/lib/calendar";
import { board, type Row } from "@/server/queries";
import { getCtx } from "@/server/session";

const ACTIVE = ["watching", "bidding", "submitted"];

export default async function Today() {
  const { day, rows } = await board(await getCtx());

  const changed = rows.filter((row) => row.unseen.length > 0 && ACTIVE.includes(row.status));
  const fresh = rows.filter((row) => row.status === "new");
  const matches = fresh.filter((row) => row.fit.verdict !== "no").sort((a, b) => Number(b.foundToday) - Number(a.foundToday));
  const filtered = fresh.filter((row) => row.fit.verdict === "no");
  const dueSoon = rows
    .filter((row) => (row.status === "bidding" || row.status === "watching") && row.eff.facts.due && !isPast(row.eff.facts.due.value, day) && daysUntil(row.eff.facts.due.value, day) < 7)
    .sort((a, b) => a.eff.facts.due!.value.localeCompare(b.eff.facts.due!.value));

  const foundToday = rows.filter((row) => row.foundToday).length;
  const addendaToday = rows.reduce((count, row) => count + row.eff.addenda.filter((addendum) => addendum.day === day).length, 0);
  const found = [
    foundToday ? `${foundToday} new ${foundToday === 1 ? "solicitation" : "solicitations"}` : null,
    addendaToday ? `${addendaToday === 1 ? "an addendum" : `${addendaToday} addenda`} to something you are following` : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fmtLongDay(day)}</h1>
      <p className="mt-2 max-w-3xl text-lg leading-relaxed text-muted">
        {found.length ? `This morning's check of the agency feeds found ${found.join(" and ")}.` : "This morning's check of the agency feeds found nothing new."}{" "}
        {foundToday ? `${foundToday === 1 ? "It was" : "Each one was"} read by AI and compared with your company profile.` : ""}
      </p>

      <Guide day={day} rows={rows} />

      {changed.length > 0 && (
        <section aria-labelledby="changed" className="mt-10">
          <h2 id="changed" className="text-2xl font-extrabold tracking-tight">
            Changed since you last looked
          </h2>
          <ul className="mt-4 space-y-4">
            {changed.map((row) => (
              <ChangedCard key={row.id} row={row} day={day} />
            ))}
          </ul>
        </section>
      )}

      {dueSoon.length > 0 && (
        <section aria-labelledby="due-soon" className="mt-10">
          <h2 id="due-soon" className="text-2xl font-extrabold tracking-tight">
            Due within a week
          </h2>
          <ul className="mt-4 space-y-3">
            {dueSoon.map((row) => (
              <li key={row.id} className="panel flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1 basis-64">
                  <StatusChip status={row.status} />
                  <p className="mt-1 text-lg font-bold leading-snug">
                    <Link href={hrefOf(row)} className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-accent">
                      {row.doc.title}
                    </Link>
                  </p>
                </div>
                <Stamp due={row.eff.facts.due!.value} day={day} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="matches" className="mt-10">
        <h2 id="matches" className="text-2xl font-extrabold tracking-tight">
          Waiting for a decision
        </h2>
        <p className="mt-1 text-muted">Solicitations the rules say you could bid. Open one to read it, then watch it, bid or pass.</p>
        {matches.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {matches.map((row) => (
              <MatchCard key={row.id} row={row} day={day} />
            ))}
          </ul>
        ) : (
          <p className="panel mt-4 p-5">Nothing is waiting. Everything that fits has been decided, and it is all in the pipeline.</p>
        )}
      </section>

      {filtered.length > 0 && (
        <section aria-labelledby="filtered" className="mt-10">
          <h2 id="filtered" className="text-2xl font-extrabold tracking-tight">
            Filtered out
          </h2>
          <p className="mt-1 text-muted">
            Found and read, but a rule says they are not for you. The reason is shown so you can check the rule was right. Changing your{" "}
            <Link href="/profile" className="font-semibold text-accent underline underline-offset-4">
              company profile
            </Link>{" "}
            changes what lands here.
          </p>
          <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
            {filtered.map((row) => (
              <li key={row.id} className="p-4">
                <p className="font-bold leading-snug">
                  <Link href={hrefOf(row)} className="underline decoration-line decoration-2 underline-offset-4 hover:decoration-accent">
                    {row.doc.title}
                  </Link>{" "}
                  <span className="font-normal text-muted">{row.doc.agency}</span>
                </p>
                <div className="mt-2">
                  <ReasonList reasons={row.fit.reasons} only={["block"]} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/** A bid or a watched solicitation that an addendum has changed, with what it said before and what it says now. */
function ChangedCard({ row, day }: { row: Row; day: number }) {
  return (
    <li className="rounded-md border-2 border-due bg-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="min-w-0 flex-1">
          <StatusChip status={row.status} />
          <h3 className="mt-2 text-xl font-extrabold leading-snug tracking-tight">{row.doc.title}</h3>
          <p className="mt-1 text-muted">{row.doc.agency}</p>
        </div>
        <Stamp due={row.eff.facts.due?.value} day={day} />
      </div>
      {row.unseen.map((addendum) => (
        <div key={addendum.key} className="border-t border-line p-4 sm:p-5">
          <p className="font-bold text-due">
            Addendum {addendum.number}, found {addendum.day === day ? "this morning" : fmtShortDay(addendum.day)}
          </p>
          <p className="mt-1 max-w-3xl leading-relaxed">{addendum.summary}</p>
          <dl className="mt-4 space-y-3">
            {addendum.changes.slice(0, 3).map((change) => (
              <div key={change.what} className="grid gap-x-4 gap-y-1 sm:grid-cols-[11rem_1fr]">
                <dt className="font-bold">{change.what}</dt>
                <dd>
                  <p className="text-muted line-through decoration-due/70">
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
        <Link href={hrefOf(row)} className="btn btn-primary">
          Open it and see where it says so
        </Link>
      </div>
    </li>
  );
}

/** The three things worth doing first. It follows the demo calendar, so each step names what is on the screen now. */
function Guide({ day, rows }: { day: number; rows: Row[] }) {
  const boiler = rows.find((row) => row.key === "boiler");
  const sample = rows.find((row) => row.key === "rtu");
  const link = "font-semibold text-accent underline underline-offset-4";
  return (
    <section aria-labelledby="guide" className="mt-6 rounded-md border border-accent/30 bg-accent-tint p-4 sm:p-5">
      <h2 id="guide" className="text-lg font-extrabold">
        Three things to try
      </h2>
      <ol className="mt-3 grid gap-4 leading-snug md:grid-cols-3">
        <li>
          <strong className="font-bold">1. See where it says so.</strong>{" "}
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
        </li>
        <li>
          <strong className="font-bold">2. Catch an addendum.</strong>{" "}
          {day === 0 || !boiler ? (
            <>
              Press <em>Skip to next morning</em> in the bar at the top. Overnight, the school district changes a bid you are halfway through.
            </>
          ) : (
            <>
              An addendum moved the deadline on the{" "}
              <Link href={hrefOf(boiler)} className={link}>
                boiler bid
              </Link>{" "}
              and added a bond. Open it, then try to hand the bid in.
            </>
          )}
        </li>
        <li>
          <strong className="font-bold">3. Change what fits.</strong> In{" "}
          <Link href="/profile" className={link}>
            Company profile
          </Link>
          , widen how far you travel or add a certification, and watch a filtered job become one you could bid.
        </li>
      </ol>
    </section>
  );
}
