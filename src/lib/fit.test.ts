import { describe, expect, it } from "vitest";
import { effective } from "./effective";
import { assessFit, fmtEstimate, fmtEstimateFact } from "./fit";
import { DEFAULT_PROFILE, type Profile } from "./profile";

const fit = (key: string, miles: number, profile: Partial<Profile> = {}, day = 0) => assessFit(effective(key, day).facts, miles, { ...DEFAULT_PROFILE, ...profile }, day);
const level = (result: ReturnType<typeof fit>, key: string) => result.reasons.find((reason) => reason.key === key)?.level;

describe("the fit rules", () => {
  it("pass a job that suits the company on every count", () => {
    const result = fit("rtu", 27);
    expect(result.verdict).toBe("good");
    expect(result.reasons.every((reason) => reason.level === "ok")).toBe(true);
  });

  it("block work of a type the company does not take, and a license it does not hold", () => {
    const result = fit("roof", 41);
    expect(result.verdict).toBe("no");
    expect(level(result, "work")).toBe("block");
    expect(level(result, "licence")).toBe("block");
    expect(fit("roof", 41, { naics: ["238220", "238160"], licences: ["S350", "S280"] }).verdict).toBe("good");
  });

  it("block a set-aside the company is not certified for", () => {
    expect(level(fit("clinic-controls", 22), "set_aside")).toBe("block");
    expect(level(fit("clinic-controls", 22, { certs: ["small_business", "sdvosb"] }), "set_aside")).toBe("ok");
  });

  it("block a job bigger than the bonding limit", () => {
    expect(level(fit("central-plant", 48), "size")).toBe("block");
    expect(level(fit("central-plant", 48, { bonding: 5_000_000 }), "size")).toBe("ok");
  });

  it("only caution about distance, since that is the company's call", () => {
    const far = fit("red-mesa", 215);
    expect(far.verdict).toBe("check");
    expect(level(far, "distance")).toBe("caution");
    expect(fit("red-mesa", 215, { radius: 250 }).verdict).toBe("good");
  });

  it("caution when there is under a week left, and block once it has closed", () => {
    expect(level(fit("heat-exchanger", 9), "time")).toBe("caution");
    expect(level(fit("heat-exchanger", 9, {}, 5), "time")).toBe("block");
  });

  it("block a job whose mandatory meeting has been held", () => {
    // Addendum 1, found on day 2, makes the chiller's meeting mandatory on Monday, March 8 at 9:00.
    expect(level(fit("chiller", 41, {}, 5), "meeting")).toBeUndefined();
    expect(level(fit("chiller", 41, {}, 6), "meeting")).toBe("block");
  });

  it("write an estimate the way the solicitation gave it", () => {
    expect(fmtEstimate({ low: 380_000, high: 450_000 })).toBe("$380,000 to $450,000");
    expect(fmtEstimate({ low: 140_000, high: 140_000 })).toBe("$140,000");
    expect(fmtEstimate({ low: null, high: 30_000 })).toBe("under $30,000");
    expect(fmtEstimate({ low: 4_200_000, high: 4_800_000 })).toBe("$4.2 million to $4.8 million");
  });

  it("say so when the figure is a yearly budget", () => {
    expect(fmtEstimateFact(effective("hvac-maint", 0).facts.estimated_value!)).toBe("$95,000 per year");
    expect(fmtEstimateFact(effective("rtu", 0).facts.estimated_value!)).not.toContain("per year");
  });
});
