import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { COMPANY } from "@/lib/profile";
import { board } from "@/server/queries";
import { getCtx } from "@/server/session";

export const metadata: Metadata = { title: "Company profile" };

export default async function ProfilePage() {
  const { day, profile, rows } = await board(await getCtx());
  // Only solicitations nobody has decided on: a decision already made is not undone by a setting.
  const items = rows.filter((row) => row.status === "new").map((row) => ({ id: row.id, title: row.doc.title, agency: row.doc.agency, facts: row.eff.facts, miles: row.feed.miles }));
  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <h1 className="display">Company profile</h1>
      <p className="mt-3 max-w-[44rem] text-lg leading-relaxed">
        What {COMPANY.name} can take on. Every solicitation is compared with this, so changing it changes which jobs are matches. The list beside the form shows the effect before you save.
      </p>
      <ProfileForm saved={profile} items={items} day={day} />
    </main>
  );
}
