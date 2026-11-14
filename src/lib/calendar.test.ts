import { describe, expect, it } from "vitest";
import { countdown, daysUntil, fmtLongDay, fmtShortDay, fmtTimeOf, fmtWhen, isPast, leafParts, stampParts } from "./calendar";

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
    expect(stampParts("2027-03-18T14:00")).toEqual({ date: "Mar 18", time: "Thu, 2:00 PM MT" });
    expect(fmtWhen("2027-03-05T12:00")).toBe("Fri, Mar 5 at noon");
    expect(stampParts("2027-03-05T12:00")).toEqual({ date: "Mar 5", time: "Fri, noon MT" });
  });
});

describe("a leaf of the desk calendar", () => {
  it("gives the weekday and the date the way the rest of the app does", () => {
    expect(leafParts("2027-03-04T10:00")).toEqual({ weekday: "Thu", date: "Mar 4" });
    expect(leafParts("2027-03-15")).toEqual({ weekday: "Mon", date: "Mar 15" });
  });

  it("gives a time only when the agency stated one, and says noon", () => {
    expect(fmtTimeOf("2027-03-11T16:00")).toBe("4:00 PM");
    expect(fmtTimeOf("2027-03-04T12:00")).toBe("noon");
    expect(fmtTimeOf("2027-03-12")).toBe("");
  });
});
