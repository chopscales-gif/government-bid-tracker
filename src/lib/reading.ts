import { z } from "zod";

/**
 * The shape of a recorded AI reading. The readings themselves are in
 * src/data/readings, one file per solicitation or addendum, saved as the model
 * wrote them. content/READING-INSTRUCTIONS.md is what the model was asked to do.
 */

const cited = <T extends z.ZodType>(value: T) => z.object({ value, section: z.string(), quote: z.string() }).nullable();

const when = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/);
const bond = z.object({ required: z.boolean(), detail: z.string() });

export const SET_ASIDES = ["none", "small_business", "sdvosb", "wosb", "hubzone", "8a", "other"] as const;

const facts = {
  naics: cited(z.string()),
  set_aside: cited(z.enum(SET_ASIDES)),
  /** `low` is null when the solicitation gives only a ceiling ("under $30,000"). */
  estimated_value: cited(z.object({ low: z.number().nullable(), high: z.number() })),
  due: cited(when),
  questions_due: cited(when),
  prebid: cited(z.object({ when, mandatory: z.boolean() })),
  bid_bond: cited(bond),
  performance_bond: cited(bond),
  licences: cited(z.object({ codes: z.array(z.string()), need: z.enum(["all", "any"]) })),
  submission: cited(z.string()),
};

const item = z.object({ text: z.string(), section: z.string(), quote: z.string() });
const note = z.object({ text: z.string(), section: z.string() });

export const readingSchema = z.object({
  summary: z.string(),
  facts: z.object(facts),
  checklist: z.array(item),
  after_award: z.array(item),
  notes: z.array(note),
});

export const addendumSchema = z.object({
  summary: z.string(),
  changes: z.array(z.object({ what: z.string(), before: z.string(), after: z.string(), section: z.string(), quote: z.string() })),
  /** Only the facts this addendum changed. */
  facts: z.object(facts).partial(),
  checklist_added: z.array(item),
  settles: z.array(note),
  notes: z.array(note),
});

export type Reading = z.infer<typeof readingSchema>;
export type AddendumReading = z.infer<typeof addendumSchema>;
export type Facts = Reading["facts"];
export type FactKey = keyof Facts;
export type SetAside = (typeof SET_ASIDES)[number];
