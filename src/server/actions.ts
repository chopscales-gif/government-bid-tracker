"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { resetSandbox } from "@/db/sandbox";
import { profileSchema } from "@/lib/profile";
import { getCtx, sandboxIdFromCookie } from "./session";
import { WorkflowError, acknowledge, nextMorning, pass, recordResult, reopenBid, saveProfile, startBid, submit, tick, watch, type Ctx } from "./workflow";

/**
 * Server actions: the thin layer between the screens and the workflow. Each one
 * validates its input, runs a workflow function in the visitor's sandbox, and
 * returns a plain result the screen can show.
 */

/** `goto` is where the screen should go next, when the action decides that. */
export type ActionResult = { ok: true; goto?: string } | { ok: false; error: string };

async function run(work: (ctx: Ctx) => Promise<string | void>): Promise<ActionResult> {
  let goto: string | void;
  try {
    goto = await work(await getCtx());
  } catch (error) {
    if (error instanceof WorkflowError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong on our side. Try again, or reset the demo from the bar at the top." };
  }
  revalidatePath("/", "layout");
  return goto ? { ok: true, goto } : { ok: true };
}

const id = z.uuid();
const BAD_INPUT: ActionResult = { ok: false, error: "That did not look right. Reload the page and try again." };

const simple = (work: (ctx: Ctx, id: string) => Promise<void>) => async (opportunityId: string) => {
  if (!id.safeParse(opportunityId).success) return BAD_INPUT;
  return run((ctx) => work(ctx, opportunityId));
};

export const watchAction = async (opportunityId: string) => simple(watch)(opportunityId);
export const startBidAction = async (opportunityId: string) => simple(startBid)(opportunityId);
export const acknowledgeAction = async (opportunityId: string) => simple(acknowledge)(opportunityId);
export const submitAction = async (opportunityId: string) => simple(submit)(opportunityId);
export const reopenBidAction = async (opportunityId: string) => simple(reopenBid)(opportunityId);

const passing = z.object({ id, reason: z.string().max(300) });

export async function passAction(input: z.input<typeof passing>): Promise<ActionResult> {
  const parsed = passing.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run((ctx) => pass(ctx, parsed.data.id, parsed.data.reason));
}

const ticking = z.object({ id, item: z.string().regex(/^(base|a\d):\d{1,3}$/), done: z.boolean() });

export async function tickAction(input: z.input<typeof ticking>): Promise<ActionResult> {
  const parsed = ticking.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run((ctx) => tick(ctx, parsed.data.id, parsed.data.item, parsed.data.done));
}

const outcome = z.object({ id, result: z.enum(["won", "lost"]) });

export async function resultAction(input: z.input<typeof outcome>): Promise<ActionResult> {
  const parsed = outcome.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run((ctx) => recordResult(ctx, parsed.data.id, parsed.data.result));
}

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return BAD_INPUT;
  return run((ctx) => saveProfile(ctx, parsed.data));
}

/** Moves the demo calendar on a day and shows what the morning check found. */
export async function nextMorningAction(): Promise<ActionResult> {
  return run(async (ctx) => {
    await nextMorning(ctx);
    return "/";
  });
}

/** Throws away this visitor's changes and starts again on the first morning. */
export async function resetDemoAction(): Promise<void> {
  await resetSandbox(await getDb(), await sandboxIdFromCookie());
  revalidatePath("/", "layout");
  redirect("/");
}
