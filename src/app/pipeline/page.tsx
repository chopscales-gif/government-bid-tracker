import type { Metadata } from "next";
import Link from "next/link";
import { NextDateLine, PipelineRow } from "@/components/cards";
import { PageHeader } from "@/components/ui";
import type { Status } from "@/db/schema";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Pipeline" };

// Being worked first, then waiting on the agency, then what is over.
const ORDER: Status[] = ["bidding", "watching", "submitted", "won", "lost", "passed"];
const OPEN: Status[] = ["bidding", "watching", "submitted"];

export default async function Pipeline() {
  const { day, rows } = await board(await getCtx());
  const due = (key: string) => rows.find((row) => row.key === key)?.eff.facts.due?.value ?? "9999";
  const sorted = rows.filter((row) => row.status !== "new").sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || due(a.key).localeCompare(due(b.key)));
  const following = sorted.filter((row) => OPEN.includes(row.status));
  const over = sorted.filter((row) => !OPEN.includes(row.status));
  const bids = following.filter((row) => row.status === "bidding").length;

  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5">
      <PageHeader
        title={following.length === 0 ? "Nothing is being followed yet." : following.length === 1 ? "One solicitation is being followed." : `${following.length} solicitations are being followed.`}
        accent={following.length === 0 ? undefined : bids === 0 ? "No bids are under way." : bids === 1 ? "One bid is under way." : `${bids} bids are under way.`}
      />
      {following.length > 0 ? (
        <ul className="rows">
          {following.map((row) => (
            <PipelineRow key={row.id} row={row} day={day} />
          ))}
        </ul>
      ) : (
        <p className="panel p-6 text-muted">
          Decide to watch or bid on something from{" "}
          <Link href="/" className="quiet">
            Today
          </Link>{" "}
          and it lands here.
        </p>
      )}
      {over.length > 0 && (
        <>
          <h2 className="heading mt-12 mb-4">Decided or passed</h2>
          <ul className="rows">
            {over.map((row) => (
              <PipelineRow key={row.id} row={row} day={day} />
            ))}
          </ul>
        </>
      )}
      <div className="pt-7 pb-20 text-muted">
        <NextDateLine rows={rows} day={day} />
      </div>
    </main>
  );
}
