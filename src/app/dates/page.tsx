import type { Metadata } from "next";
import Link from "next/link";
import { DeskCalendar } from "@/components/cards";
import { PageHeader } from "@/components/ui";
import { ZONE } from "@/lib/calendar";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Dates" };

/** The desk calendar on its own page: every date coming up on what is being bid or watched. */
export default async function Dates() {
  const { day, rows } = await board(await getCtx());
  const back = (
    <Link href="/pipeline" className="font-medium text-muted hover:text-ink">
      ← Pipeline
    </Link>
  );
  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5">
      <PageHeader back={back} title="Dates in the next two weeks." accent="On what you are bidding or watching." />
      <DeskCalendar rows={rows} day={day} />
      <p className="pt-7 pb-20 text-muted">Times are local to the agency: {ZONE.name}.</p>
    </main>
  );
}
