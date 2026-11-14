import { describe, expect, it } from "vitest";
import { effective } from "./effective";
import { dueLabel, keyDates } from "./keydates";

describe("a solicitation with its addenda laid over it", () => {
  it("stands as issued until the morning the addendum is found", () => {
    const before = effective("boiler", 0);
    expect(before.addenda).toHaveLength(0);
    expect(before.facts.due?.value).toBe("2027-03-18T14:00");
    expect(before.checklist.some((item) => item.changed)).toBe(false);
  });

  it("replaces the facts an addendum changed and remembers what they were", () => {
    const after = effective("boiler", 1);
    expect(after.facts.due).toMatchObject({ value: "2027-03-15T14:00", was: "2027-03-18T14:00", addendum: 1 });
    expect(after.facts.bid_bond?.value.required).toBe(true);
    expect(after.checklist.filter((item) => item.addendum === 1)).toHaveLength(2);
  });

  it("flags the original checklist item that still states the old deadline", () => {
    const after = effective("boiler", 1);
    const stale = after.checklist.filter((item) => item.changed);
    expect(stale).toHaveLength(1);
    expect(stale[0].text).toContain("March 18, 2027");
    expect(stale[0].changed).toEqual({ addendum: 1, fact: "due" });
  });

  it("leaves no original item stating a date the addendum moved without a flag", () => {
    // Every checklist item that names the old due date, in either demo addendum, must be flagged.
    for (const key of ["boiler", "chiller"]) {
      const issued = effective(key, 0);
      const now = effective(key, 10);
      const moved = keyDates(now.facts).filter((date) => date.was && date.was !== date.when && date.key === "due");
      for (const date of moved) {
        const old = keyDates(issued.facts).find((entry) => entry.key === date.key)!;
        for (const item of now.checklist) {
          if (item.addendum === null && item.source.quote === old.source.quote) expect(item.changed, `${key}: "${item.text}"`).toBeDefined();
        }
      }
    }
  });
});

describe("what is due", () => {
  it("is named the way the agency names it", () => {
    expect(dueLabel("Invitation for Bids")).toBe("Bids due");
    expect(dueLabel("Request for Quotations")).toBe("Quotes due");
    expect(dueLabel("Request for Proposals")).toBe("Proposals due");
    expect(dueLabel("Combined Synopsis and Solicitation")).toBe("Offers due");
  });
});
