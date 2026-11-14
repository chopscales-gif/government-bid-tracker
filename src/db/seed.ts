import { randomUUID } from "node:crypto";
import { READINGS } from "@/data/readings";
import { FEED } from "@/lib/feed";
import type { Db } from "./client";
import { events, opportunities } from "./schema";

/**
 * The pipeline a new visitor starts with: two bids under way, one handed in,
 * one being watched, and the rest untouched. Solicitations found on later
 * mornings are seeded too, and stay hidden until the visitor's calendar reaches them.
 */
export async function seedSandbox({ db, sandboxId }: { db: Db; sandboxId: string }): Promise<void> {
  const rows = FEED.map((item) => ({
    id: randomUUID(),
    sandboxId,
    key: item.key,
    status: item.start,
    checked: READINGS[item.key].checklist.slice(0, item.ticked ?? 0).map((_, index) => `base:${index}`),
    item,
  }));
  await db.insert(opportunities).values(rows.map(({ id, key, status, checked }) => ({ id, sandboxId, key, status, checked })));

  const history: { opportunityId: string; day: number; text: string }[] = [];
  for (const { id, item } of rows) {
    history.push({ opportunityId: id, day: item.day, text: "Found by the morning check and read by the AI." });
    if (item.start === "watching") history.push({ opportunityId: id, day: item.day + 1, text: "Marked to watch." });
    if (item.start === "bidding" || item.start === "submitted") history.push({ opportunityId: id, day: item.day + 1, text: "Decided to bid." });
    if (item.start === "submitted") history.push({ opportunityId: id, day: -3, text: "Bid handed in." });
  }
  await db.insert(events).values(history.map((event) => ({ sandboxId, ...event })));
}
