import type { Metadata } from "next";
import Link from "next/link";
import { DeskCalendar, EntryHead, PipelineCard } from "@/components/cards";
import { PageHeader } from "@/components/ui";
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
  const following = rows.filter((row) => row.status === "bidding" || row.status === "watching" || row.status === "submitted").length;
  const undecided = rows.filter((row) => row.status === "new" && row.fit.verdict !== "no").length;

  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader title="Pipeline" accent={following === 0 ? "Nothing is being followed yet." : following === 1 ? "One solicitation is being followed." : `${following} solicitations are being followed.`}>
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
      </PageHeader>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_23rem] xl:gap-12">
        <div className="space-y-12">
          {GROUPS.map((group, index) => {
            const members = rows.filter((row) => group.statuses.includes(row.status)).sort((a, b) => due(a.key).localeCompare(due(b.key)));
            if (!members.length && !group.empty) return null;
            // The column headings are said once, over the first register on the page.
            const first = GROUPS.findIndex((other) => rows.some((row) => other.statuses.includes(row.status))) === index;
            return (
              <section key={group.title}>
                <h2 className="heading">
                  {group.title} <span className="ml-1 font-normal text-faint tabular-nums">{members.length || ""}</span>
                </h2>
                {members.length ? (
                  <div className="mt-4">
                    {first && <EntryHead last="Where it stands" />}
                    <ul className="grid gap-3.5">
                      {members.map((row) => (
                        <PipelineCard key={row.id} row={row} day={day} />
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-3 rounded-[1.25rem] border border-dashed border-edge px-5 py-4 text-muted">{group.empty}</p>
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
