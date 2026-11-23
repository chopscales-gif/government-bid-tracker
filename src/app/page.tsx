import Link from "next/link";
import { ChangedRow, MatchRow, NextDateLine } from "@/components/cards";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

const ACTIVE = ["watching", "bidding", "submitted"];

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Today: what the morning check found, and the one list of things that want a look. */
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
    addendaToday ? (addendaToday === 1 ? "one addendum" : `${addendaToday} addenda`) : null,
  ].filter(Boolean);
  const waiting = matches.length;
  // The tour opens the rooftop unit job while it is still undecided, and otherwise whatever leads the list.
  const sample = matches.find((row) => row.key === "rtu") ?? matches[0];

  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5">
      <header className="pt-7 pb-8 sm:pt-12 sm:pb-10">
        <h1 className="display">
          {found.length ? `${capital(found.join(" and "))} this morning.` : "Nothing new this morning."}
          <span className="accent"> {waiting === 0 ? "Nothing is waiting for your decision." : waiting === 1 ? "One is waiting for your decision." : `${waiting} are waiting for your decision.`}</span>
        </h1>
      </header>

      {changed.length + matches.length > 0 ? (
        <ul className="rows" data-tour="list">
          {changed.map((row) => (
            <ChangedRow key={row.id} row={row} day={day} />
          ))}
          {matches.map((row) => (
            <MatchRow key={row.id} row={row} day={day} tour={row === sample} />
          ))}
        </ul>
      ) : (
        <p className="panel p-6 text-muted" data-tour="list">
          Everything that fits has been decided, and it is all in the{" "}
          <Link href="/pipeline" className="quiet">
            pipeline
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap gap-x-9 gap-y-3 pt-7 pb-20 text-muted">
        {filtered.length > 0 && (
          <p>
            {filtered.length} more {filtered.length === 1 ? "was" : "were"} filtered out by your rules.{" "}
            <Link href="/filtered" className="quiet">
              See why
            </Link>
          </p>
        )}
        <NextDateLine rows={rows} day={day} />
      </div>
    </main>
  );
}
