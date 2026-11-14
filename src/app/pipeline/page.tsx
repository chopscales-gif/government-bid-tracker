import type { Metadata } from "next";
import Link from "next/link";
import { DeskCalendar, EntryHead, PipelineCard } from "@/components/cards";
import type { Status } from "@/db/schema";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Pipeline" };

const GROUPS: { title: string; statuses: Status[]; empty?: string }[] = [
  { title: "Bidding", statuses: ["bidding"], empty: "No bids are under way." },
  { title: "Watching", statuses: ["watching"], empty: "Nothing is being watched." },
  { title: "Handed in, waiting for the award", statuses: ["submitted"] },
  { title: "Decided", statuses: ["won", "lost"] },
  { title: "Passed", statuses: ["passed"] },
];

export default async function Pipeline() {
  const { day, rows } = await board(await getCtx());
  const due = (key: string) => rows.find((row) => row.key === key)?.eff.facts.due?.value ?? "9999";
  const undecided = rows.filter((row) => row.status === "new" && row.fit.verdict !== "no").length;

  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="display">Pipeline</h1>
      <p className="mt-3 max-w-[44rem] text-lg leading-relaxed">
        Everything you have decided to follow, soonest deadline first.{" "}
        {undecided > 0 && (
          <>
            {undecided} more {undecided === 1 ? "is" : "are"} on{" "}
            <Link href="/" className="link">
              Today
            </Link>{" "}
            waiting for a decision.
          </>
        )}
      </p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-10">
        <div className="space-y-10">
          {GROUPS.map((group, index) => {
            const members = rows.filter((row) => group.statuses.includes(row.status)).sort((a, b) => due(a.key).localeCompare(due(b.key)));
            if (!members.length && !group.empty) return null;
            // The column headings are said once, over the first register on the page.
            const first = GROUPS.findIndex((other) => rows.some((row) => other.statuses.includes(row.status))) === index;
            return (
              <section key={group.title}>
                <h2 className="heading">
                  {group.title} <span className="font-normal text-muted">{members.length || ""}</span>
                </h2>
                {members.length ? (
                  <div className="panel mt-3">
                    {first && <EntryHead last="Where it stands" />}
                    <ul>
                      {members.map((row) => (
                        <PipelineCard key={row.id} row={row} day={day} />
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-muted">{group.empty}</p>
                )}
              </section>
            );
          })}
        </div>
        <DeskCalendar rows={rows} day={day} />
      </div>
    </main>
  );
}
