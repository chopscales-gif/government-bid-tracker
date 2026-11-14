import { ADDENDUM_READINGS, READINGS } from "@/data/readings";
import { FEED_BY_KEY } from "./feed";
import type { FactKey, Facts } from "./reading";

/**
 * A solicitation as it stands on a given day: the original reading with every
 * addendum found so far laid over it. An addendum replaces the facts it
 * changed and adds to the checklist. Everything keeps a pointer to the
 * document and section it came from.
 */

/** Where something was read: which document, which section, and the words. */
export type Source = { doc: string; section: string; quote: string };

type ValueOf<K extends FactKey> = NonNullable<Facts[K]>["value"];
/**
 * `addendum` is the number of the addendum that last changed the fact, or null
 * if it stands as first issued. `was` is the value it replaced.
 */
export type Fact<T> = { value: T; source: Source; addendum: number | null; was?: T };
export type EffectiveFacts = { [K in FactKey]: Fact<ValueOf<K>> | null };

export type ChecklistItem = { id: string; text: string; source: Source; addendum: number | null };
export type Note = { text: string; doc: string; section: string };
export type Change = { what: string; before: string; after: string; source: Source };
export type Addendum = { number: number; key: string; day: number; summary: string; changes: Change[]; settles: Note[] };

export type Effective = {
  summary: string;
  facts: EffectiveFacts;
  checklist: ChecklistItem[];
  afterAward: { text: string; source: Source }[];
  notes: Note[];
  addenda: Addendum[];
};

export function effective(key: string, day: number): Effective {
  const reading = READINGS[key];
  const source = (doc: string, from: { section: string; quote: string }): Source => ({ doc, section: from.section, quote: from.quote });

  const facts = {} as Record<FactKey, Fact<unknown> | null>;
  for (const name of Object.keys(reading.facts) as FactKey[]) {
    const fact = reading.facts[name];
    facts[name] = fact && { value: fact.value, source: source(key, fact), addendum: null };
  }
  const checklist: ChecklistItem[] = reading.checklist.map((item, index) => ({ id: `base:${index}`, text: item.text, source: source(key, item), addendum: null }));
  const notes: Note[] = reading.notes.map((note) => ({ ...note, doc: key }));
  const addenda: Addendum[] = [];

  FEED_BY_KEY[key].addenda.forEach((issued, index) => {
    if (issued.day > day) return;
    const number = index + 1;
    const added = ADDENDUM_READINGS[issued.key];
    for (const name of Object.keys(added.facts) as FactKey[]) {
      const fact = added.facts[name];
      if (fact) facts[name] = { value: fact.value, source: source(issued.key, fact), addendum: number, was: facts[name]?.value };
    }
    added.checklist_added.forEach((item, at) => checklist.push({ id: `a${number}:${at}`, text: item.text, source: source(issued.key, item), addendum: number }));
    notes.push(...added.notes.map((note) => ({ ...note, doc: issued.key })));
    addenda.push({
      number,
      key: issued.key,
      day: issued.day,
      summary: added.summary,
      changes: added.changes.map((change) => ({ what: change.what, before: change.before, after: change.after, source: source(issued.key, change) })),
      settles: added.settles.map((note) => ({ ...note, doc: issued.key })),
    });
  });

  return {
    summary: reading.summary,
    facts: facts as EffectiveFacts,
    checklist,
    afterAward: reading.after_award.map((item) => ({ text: item.text, source: source(key, item) })),
    notes,
    addenda,
  };
}
