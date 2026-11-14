import { describe, expect, it } from "vitest";
import { DOCUMENTS } from "@/data/documents";
import { ADDENDUM_READINGS, READINGS } from "@/data/readings";
import { FEED } from "./feed";
import { addendumSchema, readingSchema } from "./reading";

/**
 * The recorded readings are saved as the model wrote them, so these tests are
 * what stands between a bad recording and the screen: the shape must be right,
 * and every section and quote cited must really be in the document.
 */

type Cite = { section: string; quote?: string };

/** Everything in a reading that points at the document. */
function cites(value: unknown, found: Cite[] = []): Cite[] {
  if (Array.isArray(value)) value.forEach((entry) => cites(entry, found));
  else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.section === "string") found.push({ section: record.section, quote: typeof record.quote === "string" ? record.quote : undefined });
    Object.values(record).forEach((entry) => cites(entry, found));
  }
  return found;
}

function expectCitesIn(key: string, reading: unknown) {
  for (const cite of cites(reading)) {
    const section = DOCUMENTS[key].sections.find((candidate) => candidate.heading === cite.section);
    expect(section, `${key}: no section "${cite.section}"`).toBeDefined();
    if (cite.quote !== undefined) expect(section!.lines.some((line) => line.includes(cite.quote!)), `${key}: "${cite.quote}" is not in "${cite.section}"`).toBe(true);
  }
}

describe("the recorded readings", () => {
  it("cover every solicitation and addendum in the feed", () => {
    for (const item of FEED) {
      expect(READINGS[item.key], item.key).toBeDefined();
      expect(DOCUMENTS[item.key], item.key).toBeDefined();
      for (const addendum of item.addenda) {
        expect(ADDENDUM_READINGS[addendum.key], addendum.key).toBeDefined();
        expect(DOCUMENTS[addendum.key], addendum.key).toBeDefined();
      }
    }
  });

  it.each(Object.keys(READINGS))("%s has the right shape and cites only what is in the document", (key) => {
    readingSchema.parse(READINGS[key]);
    expectCitesIn(key, READINGS[key]);
  });

  it.each(Object.keys(ADDENDUM_READINGS))("%s has the right shape and cites only what is in the addendum", (key) => {
    addendumSchema.parse(ADDENDUM_READINGS[key]);
    expectCitesIn(key, ADDENDUM_READINGS[key]);
  });
});
