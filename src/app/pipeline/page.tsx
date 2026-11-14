import type { Metadata } from "next";
import Link from "next/link";
import { PipelineCard } from "@/components/cards";
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
  const undecided = rows.filter((row) => row.status === "new").length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pipeline</h1>
      <p className="mt-2 max-w-3xl text-lg leading-relaxed text-muted">
        Everything you have decided to follow, soonest deadline first.{" "}
        {undecided > 0 && (
          <>
            {undecided} more {undecided === 1 ? "is" : "are"} on{" "}
            <Link href="/" className="font-semibold text-accent underline underline-offset-4">
              Today
            </Link>{" "}
            with no decision yet.
          </>
        )}
      </p>
      {GROUPS.map((group) => {
        const members = rows.filter((row) => group.statuses.includes(row.status)).sort((a, b) => due(a.key).localeCompare(due(b.key)));
        if (!members.length && !group.empty) return null;
        return (
          <section key={group.title} className="mt-10">
            <h2 className="text-2xl font-extrabold tracking-tight">
              {group.title} <span className="font-normal text-muted">{members.length || ""}</span>
            </h2>
            {members.length ? (
              <ul className="mt-4 space-y-4">
                {members.map((row) => (
                  <PipelineCard key={row.id} row={row} day={day} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted">{group.empty}</p>
            )}
          </section>
        );
      })}
    </main>
  );
}
