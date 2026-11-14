import { beforeAll, describe, expect, it } from "vitest";
import { createEmbeddedDb, type Db } from "@/db/client";
import { ensureSandbox, resetSandbox } from "@/db/sandbox";
import { board, history } from "./queries";
import { WorkflowError, acknowledge, nextMorning, pass, recordResult, reopenBid, saveProfile, startBid, submit, tick, watch, type Ctx } from "./workflow";
import { DEFAULT_PROFILE } from "@/lib/profile";
import { MAX_DAY } from "@/lib/calendar";

/** End-to-end tests of the bid workflow against a real (in-memory) Postgres. */

let db: Db;
let count = 0;

/** A fresh sandbox for each test, so tests cannot affect each other. */
async function fresh(): Promise<Ctx> {
  const sandboxId = `visitor-${++count}`;
  await ensureSandbox(db, sandboxId);
  return { db, sandboxId };
}

const row = async (ctx: Ctx, key: string) => (await board(ctx)).rows.find((candidate) => candidate.key === key)!;
const verdicts = async (ctx: Ctx) => Object.fromEntries((await board(ctx)).rows.map((candidate) => [candidate.key, candidate.fit.verdict]));

async function tickAll(ctx: Ctx, key: string) {
  const current = await row(ctx, key);
  for (const item of current.eff.checklist) await tick(ctx, current.id, item.id, true);
}

beforeAll(async () => {
  db = await createEmbeddedDb();
});

describe("the first morning", () => {
  it("shows the eleven solicitations found so far and hides the ones still to come", async () => {
    const ctx = await fresh();
    const { day, rows } = await board(ctx);
    expect(day).toBe(0);
    expect(rows).toHaveLength(11);
    expect(rows.map((candidate) => candidate.key)).not.toContain("kitchen-hoods");
    expect(rows.filter((candidate) => candidate.foundToday).map((candidate) => candidate.key)).toEqual(["rtu", "water-heaters", "heat-exchanger"]);
  });

  it("starts with two bids under way, one handed in and one watched", async () => {
    const ctx = await fresh();
    expect((await row(ctx, "boiler")).status).toBe("bidding");
    expect((await row(ctx, "boiler")).checked).toHaveLength(3);
    expect((await row(ctx, "hvac-maint")).status).toBe("bidding");
    expect((await row(ctx, "chiller")).status).toBe("watching");
    const handedIn = await row(ctx, "unit-heaters");
    expect(handedIn.status).toBe("submitted");
    expect(handedIn.checked).toHaveLength(handedIn.eff.checklist.length);
  });

  it("sorts the undecided ones by the fit rules", async () => {
    const ctx = await fresh();
    expect(await verdicts(ctx)).toMatchObject({
      rtu: "good",
      "water-heaters": "good",
      "red-mesa": "check",
      "heat-exchanger": "check",
      "clinic-controls": "no",
      roof: "no",
      "central-plant": "no",
    });
  });

  it("is seeded once, however many times the page loads", async () => {
    const ctx = await fresh();
    await ensureSandbox(db, ctx.sandboxId);
    expect((await board(ctx)).rows).toHaveLength(11);
  });
});

describe("the next morning", () => {
  it("brings new postings and an addendum to the boiler bid", async () => {
    const ctx = await fresh();
    expect((await row(ctx, "boiler")).eff.facts.due?.value).toBe("2027-03-18T14:00");
    await nextMorning(ctx);
    const { rows } = await board(ctx);
    expect(rows.filter((candidate) => candidate.foundToday).map((candidate) => candidate.key)).toEqual(["kitchen-hoods", "ranger-boilers"]);

    const boiler = await row(ctx, "boiler");
    expect(boiler.unseen.map((addendum) => addendum.number)).toEqual([1]);
    expect(boiler.eff.facts.due).toMatchObject({ value: "2027-03-15T14:00", was: "2027-03-18T14:00", addendum: 1 });
    expect(boiler.eff.facts.bid_bond?.value.required).toBe(true);
    expect(boiler.eff.checklist.filter((item) => item.addendum === 1)).toHaveLength(2);
    // Work already done on the bid is kept.
    expect(boiler.checked).toHaveLength(3);
  });

  it("makes the chiller's meeting mandatory on the second morning", async () => {
    const ctx = await fresh();
    await nextMorning(ctx);
    expect((await row(ctx, "chiller")).eff.facts.prebid?.value.mandatory).toBe(false);
    await nextMorning(ctx);
    const chiller = await row(ctx, "chiller");
    expect(chiller.eff.facts.prebid).toMatchObject({ value: { when: "2027-03-08T09:00", mandatory: true }, addendum: 1 });
    expect(chiller.unseen).toHaveLength(1);
  });

  it("stops at the end of the demo calendar", async () => {
    const ctx = await fresh();
    for (let day = 0; day < MAX_DAY; day++) await nextMorning(ctx);
    await expect(nextMorning(ctx)).rejects.toThrow(WorkflowError);
    expect((await board(ctx)).day).toBe(MAX_DAY);
  });

  it("closes what was not bid in time", async () => {
    const ctx = await fresh();
    for (let day = 0; day < MAX_DAY; day++) await nextMorning(ctx);
    const exchanger = await row(ctx, "heat-exchanger");
    expect(exchanger.fit.verdict).toBe("no");
    await expect(startBid(ctx, exchanger.id)).rejects.toThrow("deadline");
  });
});

describe("handing in a bid", () => {
  it("is refused while anything on the checklist is not done", async () => {
    const ctx = await fresh();
    const boiler = await row(ctx, "boiler");
    await expect(submit(ctx, boiler.id)).rejects.toThrow("6 things on the checklist are not done");
  });

  it("is refused while an addendum is unread, even with everything ticked", async () => {
    const ctx = await fresh();
    await tickAll(ctx, "boiler");
    await nextMorning(ctx);
    const boiler = await row(ctx, "boiler");
    await expect(submit(ctx, boiler.id)).rejects.toThrow("Addendum 1");

    // Reading it is not enough: it added two things the bid now needs.
    await acknowledge(ctx, boiler.id);
    expect((await row(ctx, "boiler")).unseen).toHaveLength(0);
    await expect(submit(ctx, boiler.id)).rejects.toThrow("2 things");

    await tickAll(ctx, "boiler");
    await submit(ctx, boiler.id);
    expect((await row(ctx, "boiler")).status).toBe("submitted");
    expect((await history(ctx, boiler.id)).map((event) => event.text)).toContain("Addendum 1 read and acknowledged.");
  });

  it("can be taken back while the deadline is ahead", async () => {
    const ctx = await fresh();
    await tickAll(ctx, "hvac-maint");
    const maintenance = await row(ctx, "hvac-maint");
    await submit(ctx, maintenance.id);
    await reopenBid(ctx, maintenance.id);
    expect((await row(ctx, "hvac-maint")).status).toBe("bidding");
    await expect(recordResult(ctx, maintenance.id, "won")).rejects.toThrow(WorkflowError);
  });

  it("cannot be taken back once bids have closed, and then the result is recorded", async () => {
    const ctx = await fresh();
    const heaters = await row(ctx, "unit-heaters");
    await expect(reopenBid(ctx, heaters.id)).rejects.toThrow("deadline");
    await recordResult(ctx, heaters.id, "won");
    expect((await row(ctx, "unit-heaters")).status).toBe("won");
  });
});

describe("deciding", () => {
  it("watches, bids and ticks", async () => {
    const ctx = await fresh();
    const rtu = await row(ctx, "rtu");
    await expect(tick(ctx, rtu.id, "base:0", true)).rejects.toThrow(WorkflowError);
    await watch(ctx, rtu.id);
    await startBid(ctx, rtu.id);
    await tick(ctx, rtu.id, "base:0", true);
    await tick(ctx, rtu.id, "base:0", true);
    expect((await row(ctx, "rtu")).checked).toEqual(["base:0"]);
    await tick(ctx, rtu.id, "base:0", false);
    expect((await row(ctx, "rtu")).checked).toEqual([]);
    await expect(tick(ctx, rtu.id, "base:99", true)).rejects.toThrow("not on this checklist");
  });

  it("needs a reason to pass, and keeps it", async () => {
    const ctx = await fresh();
    const mesa = await row(ctx, "red-mesa");
    await expect(pass(ctx, mesa.id, "  ")).rejects.toThrow("Say why");
    await pass(ctx, mesa.id, "Too far for a two-week job.");
    expect(await row(ctx, "red-mesa")).toMatchObject({ status: "passed", reason: "Too far for a two-week job." });
    await startBid(ctx, mesa.id);
    expect(await row(ctx, "red-mesa")).toMatchObject({ status: "bidding", reason: "" });
  });

  it("lets a person bid on something the rules filtered out", async () => {
    const ctx = await fresh();
    const roof = await row(ctx, "roof");
    await startBid(ctx, roof.id);
    expect((await row(ctx, "roof")).status).toBe("bidding");
  });

  it("refuses a solicitation the calendar has not reached, or another visitor's", async () => {
    const ctx = await fresh();
    const other = await fresh();
    const theirs = await row(other, "rtu");
    await expect(watch(ctx, theirs.id)).rejects.toThrow(WorkflowError);
    await nextMorning(other);
    const later = await row(other, "kitchen-hoods");
    await resetSandbox(db, other.sandboxId);
    await expect(watch(other, later.id)).rejects.toThrow(WorkflowError);
  });
});

describe("the company profile", () => {
  it("changes what fits", async () => {
    const ctx = await fresh();
    await nextMorning(ctx);
    expect(await verdicts(ctx)).toMatchObject({ "ranger-boilers": "no", "red-mesa": "check", "central-plant": "no", roof: "no" });
    await saveProfile(ctx, { naics: ["238220", "238160"], certs: ["small_business", "wosb"], licences: ["S350", "S210", "S280"], radius: 250, bonding: 5_000_000 });
    expect(await verdicts(ctx)).toMatchObject({ "ranger-boilers": "good", "red-mesa": "good", "central-plant": "good", roof: "good" });
  });

  it("goes back to the default when the demo is reset", async () => {
    const ctx = await fresh();
    await saveProfile(ctx, { ...DEFAULT_PROFILE, radius: 250 });
    await nextMorning(ctx);
    await resetSandbox(db, ctx.sandboxId);
    expect(await board(ctx)).toMatchObject({ day: 0, profile: DEFAULT_PROFILE });
  });
});
