import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { PageHeader } from "@/components/ui";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Company profile" };

export default async function ProfilePage() {
  const { day, profile, rows } = await board(await getCtx());
  // Only solicitations nobody has decided on: a decision already made is not undone by a setting.
  const items = rows.filter((row) => row.status === "new").map((row) => ({ id: row.id, title: row.doc.title, agency: row.doc.agency, facts: row.eff.facts, miles: row.feed.miles }));
  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5 pb-20">
      <PageHeader title="What your company can take on." accent="Every solicitation is held to these rules." />
      <ProfileForm saved={profile} items={items} day={day} />
    </main>
  );
}
