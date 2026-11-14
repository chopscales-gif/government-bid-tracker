import { isPast } from "./calendar";
import type { EffectiveFacts, Source } from "./effective";

/** The dates a bidder has to keep, in the order they come. */
export type KeyDate = {
  key: "questions" | "prebid" | "due";
  label: string;
  when: string;
  /** What it said before an addendum changed it. */
  was?: string;
  addendum: number | null;
  source: Source;
  mandatory?: boolean;
};

/** What the agency calls the thing that is due: a bid, a quote, a proposal or an offer. */
export function dueLabel(type: string): string {
  if (/quotation/i.test(type)) return "Quotes due";
  if (/proposal/i.test(type)) return "Proposals due";
  if (/synopsis/i.test(type)) return "Offers due";
  return "Bids due";
}

export function keyDates(facts: EffectiveFacts, type = ""): KeyDate[] {
  const dates: KeyDate[] = [];
  const { questions_due: questions, prebid, due } = facts;
  if (questions) dates.push({ key: "questions", label: "Questions due", when: questions.value, was: questions.was, addendum: questions.addendum, source: questions.source });
  if (prebid) {
    dates.push({ key: "prebid", label: "Pre-bid meeting", when: prebid.value.when, was: prebid.was?.when, addendum: prebid.addendum, source: prebid.source, mandatory: prebid.value.mandatory });
  }
  if (due) dates.push({ key: "due", label: dueLabel(type), when: due.value, was: due.was, addendum: due.addendum, source: due.source });
  return dates.sort((a, b) => a.when.localeCompare(b.when));
}

/** The next date still ahead, or null once everything has passed. */
export function nextDate(facts: EffectiveFacts, day: number): KeyDate | null {
  return keyDates(facts).find((date) => !isPast(date.when, day)) ?? null;
}
