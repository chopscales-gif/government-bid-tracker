import { describe, expect, it } from "vitest";
import { countdown, daysUntil, fmtLongDay, fmtShortDay, fmtWhen, isPast, stampParts } from "./calendar";

describe("the demo calendar", () => {
  it("starts on Monday, March 1, 2027 and skips weekends", () => {
    expect(fmtLongDay(0)).toBe("Monday, March 1, 2027");
    expect(fmtShortDay(4)).toBe("Fri, Mar 5");
    expect(fmtShortDay(5)).toBe("Mon, Mar 8");
    expect(fmtLongDay(10)).toBe("Monday, March 15, 2027");
  });

  it("counts back through working days before the start", () => {
    expect(fmtShortDay(-1)).toBe("Fri, Feb 26");
    expect(fmtShortDay(-5)).toBe("Mon, Feb 22");
    expect(fmtShortDay(-9)).toBe("Tue, Feb 16");
  });

  it("counts calendar days to a deadline", () => {
    expect(daysUntil("2027-03-18T14:00", 0)).toBe(17);
    expect(daysUntil("2027-03-15T14:00", 1)).toBe(13);
    expect(daysUntil("2027-03-08", 5)).toBe(0);
  });

  it("treats a deadline later the same day as still open", () => {
    expect(isPast("2027-03-15T14:00", 10)).toBe(false);
    expect(countdown("2027-03-15T14:00", 10)).toBe("Due today");
    expect(isPast("2027-03-12T14:00", 10)).toBe(true);
    expect(countdown("2027-03-12T14:00", 10)).toBe("Closed");
    expect(countdown("2027-03-02T14:00", 0)).toBe("Due tomorrow");
    expect(countdown("2027-03-18T14:00", 0)).toBe("17 days left");
  });

  it("takes a date with no time to mean the end of that day", () => {
    expect(isPast("2027-03-08", 5)).toBe(false);
    expect(isPast("2027-03-08", 6)).toBe(true);
  });

  it("writes dates the way a person would", () => {
    expect(fmtWhen("2027-03-18T14:00")).toBe("Thu, Mar 18 at 2:00 PM");
    expect(fmtWhen("2027-03-18")).toBe("Thu, Mar 18");
    expect(stampParts("2027-03-18T14:00")).toEqual({ date: "Mar 18", time: "Thu, 2:00 PM" });
  });
});
