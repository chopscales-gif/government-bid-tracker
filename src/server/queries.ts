import { asc, eq } from "drizzle-orm";
import { DOCUMENTS, type SolicitationDoc } from "@/data/documents";
import { events, opportunities, type Status } from "@/db/schema";
import { effective, type Addendum, type Effective } from "@/lib/effective";
import { FEED, FEED_BY_KEY, type FeedItem } from "@/lib/feed";
import { assessFit, type Fit } from "@/lib/fit";
import type { Profile } from "@/lib/profile";
import { loadSandbox, type Ctx } from "./workflow";

/** What each screen reads. Nothing here changes anything. */

export type Row = {
  id: string;
  key: string;
  status: Status;
  reason: string;
  checked: string[];
  doc: SolicitationDoc;
  feed: FeedItem;
  /** The solicitation as it stands today, addenda included. */
  eff: Effective;
  fit: Fit;
  /** Addenda nobody has acknowledged yet. */
  unseen: Addendum[];
  foundToday: boolean;
};

export type Board = { day: number; profile: Profile; rows: Row[] };

/** Every solicitation the calendar has reached, in the order they were found. */
export async function board(ctx: Ctx): Promise<Board> {
  const [{ day, profile }, opps] = await Promise.all([loadSandbox(ctx), ctx.db.select().from(opportunities).where(eq(opportunities.sandboxId, ctx.sandboxId))]);
  const order = new Map(FEED.map((item, index) => [item.key, index]));
  const rows = opps
    .filter((opp) => FEED_BY_KEY[opp.key].day <= day)
    .sort((a, b) => order.get(a.key)! - order.get(b.key)!)
    .map((opp): Row => {
      const feed = FEED_BY_KEY[opp.key];
      const eff = effective(opp.key, day);
      return {
        id: opp.id,
        key: opp.key,
        status: opp.status,
        reason: opp.reason,
        checked: opp.checked,
        doc: DOCUMENTS[opp.key],
        feed,
        eff,
        fit: assessFit(eff.facts, feed.miles, profile, day),
        unseen: eff.addenda.slice(opp.seenAddenda),
        foundToday: feed.day === day,
      };
    });
  return { day, profile, rows };
}

export async function history(ctx: Ctx, opportunityId: string) {
  return ctx.db.select({ id: events.id, day: events.day, text: events.text }).from(events).where(eq(events.opportunityId, opportunityId)).orderBy(asc(events.id));
}
