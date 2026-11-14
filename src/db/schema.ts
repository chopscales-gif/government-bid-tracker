import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { Profile } from "@/lib/profile";

/**
 * Every row belongs to a sandbox: one visitor's private copy of the demo data.
 * Deleting the sandbox row removes everything that visitor changed. Every
 * foreign key has an index so that the cascade stays quick.
 */
export const sandboxes = pgTable("sandboxes", {
  id: text("id").primaryKey(),
  /** Used only to purge old sandboxes. */
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Which morning of the demo calendar this visitor is on. */
  day: integer("day").notNull().default(0),
  /** The company profile the fit rules compare against. */
  profile: jsonb("profile").$type<Profile>().notNull(),
});

const sandboxId = () =>
  text("sandbox_id")
    .notNull()
    .references(() => sandboxes.id, { onDelete: "cascade" });

export type Status = "new" | "watching" | "bidding" | "submitted" | "won" | "lost" | "passed";

/** One solicitation in one visitor's pipeline. The solicitation itself is the same for everyone. */
export const opportunities = pgTable(
  "opportunities",
  {
    id: text("id").primaryKey(),
    sandboxId: sandboxId(),
    /** Which solicitation this is: names its document, feed entry and recorded reading. */
    key: text("key").notNull(),
    status: text("status").$type<Status>().notNull().default("new"),
    /** Why it was passed on. */
    reason: text("reason").notNull().default(""),
    /** Ids of the checklist items ticked so far. */
    checked: jsonb("checked").$type<string[]>().notNull().default([]),
    /** How many of its addenda someone has read and acknowledged. */
    seenAddenda: integer("seen_addenda").notNull().default(0),
  },
  (t) => [index("opportunities_sandbox").on(t.sandboxId)],
);

/** What happened to an opportunity, oldest first. */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    sandboxId: sandboxId(),
    opportunityId: text("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    /** The demo day it happened on. */
    day: integer("day").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("events_sandbox").on(t.sandboxId), index("events_opportunity").on(t.opportunityId)],
);

export type Opportunity = typeof opportunities.$inferSelect;
