import type { Metadata } from "next";
import Link from "next/link";
import { SolicitationRow, fitNote } from "@/components/cards";
import { PageHeader, VerdictMark } from "@/components/ui";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Filtered out" };

/** Found and read, but a rule says they are not for this company. Shown so the rule can be checked. */
export default async function Filtered() {
  const { day, rows } = await board(await getCtx());
  const filtered = rows.filter((row) => row.status === "new" && row.fit.verdict === "no");
  const back = (
    <Link href="/" className="font-medium text-muted hover:text-ink">
      ← Today
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5">
      <PageHeader
        back={back}
        title={filtered.length === 0 ? "Nothing is filtered out." : filtered.length === 1 ? "One solicitation was filtered out." : `${filtered.length} solicitations were filtered out.`}
        accent={filtered.length === 0 ? undefined : filtered.length === 1 ? "A rule says it is not for you." : "A rule says they are not for you."}
      />
      {filtered.length > 0 && (
        <ul className="rows">
          {filtered.map((row) => (
            <SolicitationRow key={row.id} row={row} day={day}>
              <VerdictMark verdict="no" note={fitNote(row)} />
            </SolicitationRow>
          ))}
        </ul>
      )}
      <p className="pt-7 pb-20 text-muted">
        The rules come from your{" "}
        <Link href="/profile" className="quiet">
          company profile
        </Link>
        . Change it and what lands here changes.
      </p>
    </main>
  );
}
