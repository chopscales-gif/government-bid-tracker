import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Solicitation } from "@/components/solicitation";
import { DOCUMENTS } from "@/data/documents";
import { board, history } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Solicitation" };

export default async function SolicitationPage({ params }: PageProps<"/solicitations/[id]">) {
  const { id } = await params;
  const ctx = await getCtx();
  const { day, rows } = await board(ctx);
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) notFound();
  // The original and every addendum found so far, in the order they were issued.
  const documents = [row.doc, ...row.eff.addenda.map((addendum) => DOCUMENTS[addendum.key])];
  return <Solicitation key={`${row.id}:${day}`} row={row} day={day} documents={documents} events={await history(ctx, row.id)} />;
}
