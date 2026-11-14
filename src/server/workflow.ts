import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { events, opportunities, sandboxes, type Opportunity, type Status } from "@/db/schema";
import { MAX_DAY, fmtLongDay, isPast } from "@/lib/calendar";
import { effective } from "@/lib/effective";
import { FEED_BY_KEY } from "@/lib/feed";
import type { Profile } from "@/lib/profile";

/**
 * What a person can do with a solicitation: watch it, bid, tick off what the
 * bid needs, hand it in, pass. Every function works inside one visitor's
 * sandbox and refuses, with a reason a person can act on, anything the rules
 * do not allow.
 */

export type Ctx = { db: Db; sandboxId: string };

/** A refusal the screen can show as it is. */
export class WorkflowError extends Error {}

export async function loadSandbox(ctx: Ctx): Promise<{ day: number; profile: Profile }> {
  const [row] = await ctx.db.select({ day: sandboxes.day, profile: sandboxes.profile }).from(sandboxes).where(eq(sandboxes.id, ctx.sandboxId));
  if (!row) throw new WorkflowError("Your copy of the demo has gone. Reload the page to start a new one.");
  return row;
}

/** The opportunity, the day, and the solicitation as it stands that day. Refuses one the calendar has not reached. */
async function find(ctx: Ctx, id: string) {
  const [{ day }, [opp]] = await Promise.all([
    loadSandbox(ctx),
    ctx.db.select().from(opportunities).where(and(eq(opportunities.sandboxId, ctx.sandboxId), eq(opportunities.id, id))),
  ]);
  if (!opp || FEED_BY_KEY[opp.key].day > day) throw new WorkflowError("That solicitation is not in your pipeline. It may have gone when the demo was reset.");
  return { opp, day, eff: effective(opp.key, day) };
}

const update = (ctx: Ctx, opp: Opportunity, values: Partial<Opportunity>) => ctx.db.update(opportunities).set(values).where(eq(opportunities.id, opp.id));
const log = (ctx: Ctx, opp: Opportunity, day: number, text: string) => ctx.db.insert(events).values({ sandboxId: ctx.sandboxId, opportunityId: opp.id, day, text });

const STATUS_WORDS: Record<Status, string> = { new: "new", watching: "being watched", bidding: "being bid", submitted: "handed in", won: "won", lost: "lost", passed: "passed on" };

function mustBe(opp: Opportunity, allowed: Status[], doing: string) {
  if (!allowed.includes(opp.status)) throw new WorkflowError(`This one is ${STATUS_WORDS[opp.status]}, so you cannot ${doing}.`);
}

function mustBeOpen(due: string | undefined, day: number) {
  if (due && isPast(due, day)) throw new WorkflowError("The deadline for this one has passed.");
}

/** Moves the demo calendar to the next working morning. New postings and addenda found overnight appear. */
export async function nextMorning(ctx: Ctx): Promise<number> {
  const { day } = await loadSandbox(ctx);
  if (day >= MAX_DAY) throw new WorkflowError(`The demo calendar ends on ${fmtLongDay(MAX_DAY)}. Reset the demo to start again.`);
  await ctx.db.update(sandboxes).set({ day: day + 1 }).where(eq(sandboxes.id, ctx.sandboxId));
  return day + 1;
}

export async function saveProfile(ctx: Ctx, profile: Profile): Promise<void> {
  await ctx.db.update(sandboxes).set({ profile }).where(eq(sandboxes.id, ctx.sandboxId));
}

export async function watch(ctx: Ctx, id: string): Promise<void> {
  const { opp, day, eff } = await find(ctx, id);
  mustBe(opp, ["new", "passed"], "start watching it");
  mustBeOpen(eff.facts.due?.value, day);
  await update(ctx, opp, { status: "watching", reason: "", seenAddenda: eff.addenda.length });
  await log(ctx, opp, day, "Marked to watch.");
}

/** Decides to bid. The fit rules advise but do not forbid: the person may know something the rules do not. */
export async function startBid(ctx: Ctx, id: string): Promise<void> {
  const { opp, day, eff } = await find(ctx, id);
  mustBe(opp, ["new", "watching", "passed"], "start a bid");
  mustBeOpen(eff.facts.due?.value, day);
  // Whoever decides to bid has the current documents in front of them, unless they were already watching it.
  const seenAddenda = opp.status === "watching" ? opp.seenAddenda : eff.addenda.length;
  await update(ctx, opp, { status: "bidding", reason: "", seenAddenda });
  await log(ctx, opp, day, "Decided to bid.");
}

export async function pass(ctx: Ctx, id: string, reason: string): Promise<void> {
  const { opp, day } = await find(ctx, id);
  mustBe(opp, ["new", "watching", "bidding"], "pass on it");
  const why = reason.trim();
  if (why.length < 3) throw new WorkflowError("Say why you are passing, so the next person who sees it knows.");
  await update(ctx, opp, { status: "passed", reason: why });
  await log(ctx, opp, day, `Passed: ${why}`);
}

/** Ticks or unticks one thing the bid needs. */
export async function tick(ctx: Ctx, id: string, itemId: string, done: boolean): Promise<void> {
  const { opp, day, eff } = await find(ctx, id);
  mustBe(opp, ["bidding"], "change its checklist");
  const item = eff.checklist.find((entry) => entry.id === itemId);
  if (!item) throw new WorkflowError("That item is not on this checklist. Reload the page.");
  const checked = new Set(opp.checked);
  if (done === checked.has(itemId)) return;
  if (done) checked.add(itemId);
  else checked.delete(itemId);
  await update(ctx, opp, { checked: [...checked] });
  await log(ctx, opp, day, `${done ? "Done" : "Not done after all"}: ${item.text}`);
}

/** Records that someone has read every addenda found so far. */
export async function acknowledge(ctx: Ctx, id: string): Promise<void> {
  const { opp, day, eff } = await find(ctx, id);
  if (opp.seenAddenda >= eff.addenda.length) return;
  await update(ctx, opp, { seenAddenda: eff.addenda.length });
  for (const addendum of eff.addenda.slice(opp.seenAddenda)) await log(ctx, opp, day, `Addendum ${addendum.number} read and acknowledged.`);
}

/**
 * Records the bid as handed in. Refused while an addendum is unread or
 * anything on the checklist is not done, since either gets a bid thrown out.
 */
export async function submit(ctx: Ctx, id: string): Promise<void> {
  const { opp, day, eff } = await find(ctx, id);
  mustBe(opp, ["bidding"], "hand it in");
  mustBeOpen(eff.facts.due?.value, day);
  if (opp.seenAddenda < eff.addenda.length) throw new WorkflowError(`Addendum ${eff.addenda.length} changed this bid. Read it and press "Got it" first.`);
  const left = eff.checklist.filter((item) => !opp.checked.includes(item.id)).length;
  if (left) throw new WorkflowError(`${left === 1 ? "One thing" : `${left} things`} on the checklist ${left === 1 ? "is" : "are"} not done. A bid missing any of them can be rejected.`);
  await update(ctx, opp, { status: "submitted" });
  await log(ctx, opp, day, "Bid handed in.");
}

/** Takes a bid back to work on it again, for instance when an addendum arrives after it was handed in. */
export async function reopenBid(ctx: Ctx, id: string): Promise<void> {
  const { opp, day, eff } = await find(ctx, id);
  mustBe(opp, ["submitted"], "reopen it");
  mustBeOpen(eff.facts.due?.value, day);
  await update(ctx, opp, { status: "bidding" });
  await log(ctx, opp, day, "Bid reopened to change it.");
}

export async function recordResult(ctx: Ctx, id: string, result: "won" | "lost"): Promise<void> {
  const { opp, day } = await find(ctx, id);
  mustBe(opp, ["submitted"], "record a result");
  await update(ctx, opp, { status: result });
  await log(ctx, opp, day, result === "won" ? "Awarded to us." : "Awarded to another bidder.");
}
