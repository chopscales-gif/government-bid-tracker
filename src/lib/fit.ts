import { daysUntil, fmtWhen, isPast } from "./calendar";
import type { EffectiveFacts } from "./effective";
import { CERT_OPTIONS, NAICS_OPTIONS, fmtDollars, type Profile } from "./profile";

/**
 * Whether a solicitation suits the company. These are written rules, not AI:
 * each compares something the AI read from the solicitation with the company
 * profile, and gives its reason in plain words.
 *
 * `block` means the company cannot or should not bid. `caution` means a person
 * should look before spending time on it.
 */

export type Level = "ok" | "caution" | "block";
export type Reason = { key: string; label: string; level: Level; detail: string };
export type Verdict = "good" | "check" | "no";
export type Fit = { verdict: Verdict; reasons: Reason[] };

export const VERDICT_LABEL: Record<Verdict, string> = { good: "Good fit", check: "Check first", no: "Not a fit" };

const SET_ASIDE_NAME: Record<string, string> = Object.fromEntries(CERT_OPTIONS.map((cert) => [cert.code, cert.label.toLowerCase()]));

/** "$380,000 to $450,000", "$140,000", or "under $30,000" when only a ceiling was given. */
export function fmtEstimate(estimate: { low: number | null; high: number }): string {
  if (estimate.low === null) return `under ${fmtDollars(estimate.high)}`;
  return estimate.low === estimate.high ? fmtDollars(estimate.high) : `${fmtDollars(estimate.low)} to ${fmtDollars(estimate.high)}`;
}

export function assessFit(facts: EffectiveFacts, miles: number, profile: Profile, day: number): Fit {
  const reasons: Reason[] = [];
  const add = (key: string, label: string, level: Level, detail: string) => reasons.push({ key, label, level, detail });

  // Work type: the solicitation's NAICS code must be one the company takes.
  const naics = facts.naics?.value;
  if (!naics) add("work", "Work type", "caution", "The solicitation gives no NAICS code.");
  else {
    const name = NAICS_OPTIONS.find((option) => option.code === naics)?.label.toLowerCase();
    const described = name ? `${naics}, ${name}` : naics;
    if (profile.naics.includes(naics)) add("work", "Work type", "ok", `NAICS ${described}, which you take.`);
    else add("work", "Work type", "block", `NAICS ${described}, which is not on your list.`);
  }

  // Set-aside: a job reserved for a kind of business needs the matching certification.
  const setAside = facts.set_aside?.value;
  if (!setAside) add("set_aside", "Who may bid", "ok", "No set-aside is stated.");
  else if (setAside === "none") add("set_aside", "Who may bid", "ok", "Open to all bidders.");
  else if (setAside === "other") add("set_aside", "Who may bid", "caution", "Restricted in a way the rules do not recognize. Read the section.");
  else if (profile.certs.includes(setAside)) add("set_aside", "Who may bid", "ok", `Set aside for ${SET_ASIDE_NAME[setAside]}, which you are.`);
  else add("set_aside", "Who may bid", "block", `Set aside for ${SET_ASIDE_NAME[setAside]}, which you are not.`);

  // Licence: every licence asked for (or any one, where the solicitation allows a choice) must be held.
  const licences = facts.licences?.value;
  if (licences?.codes.length) {
    const held = licences.codes.filter((code) => profile.licences.includes(code));
    const enough = licences.need === "any" ? held.length > 0 : held.length === licences.codes.length;
    const asked = licences.codes.join(licences.need === "any" ? " or " : " and ");
    add("licence", "License", enough ? "ok" : "block", enough ? `Needs ${asked}, which you hold.` : `Needs ${asked}, which you do not hold.`);
  }

  // Size: the top of the estimate must be within what the surety will bond.
  const estimate = facts.estimated_value?.value;
  if (estimate) {
    const range = fmtEstimate(estimate);
    if (estimate.high > profile.bonding) add("size", "Size", "block", `Estimated at ${range}, above your ${fmtDollars(profile.bonding)} bonding limit.`);
    else add("size", "Size", "ok", `Estimated at ${range}, within your bonding limit.`);
  }

  // Distance from the yard.
  if (miles > profile.radius) add("distance", "Distance", "caution", `${miles} miles from the yard. You travel up to ${profile.radius} miles.`);
  else add("distance", "Distance", "ok", `${miles} miles from the yard.`);

  // A meeting that had to be attended and has already been held.
  const prebid = facts.prebid?.value;
  if (prebid?.mandatory && isPast(prebid.when, day)) add("meeting", "Mandatory meeting", "block", `Was held ${fmtWhen(prebid.when)}. Only firms that attended may bid.`);

  // Time left to put a bid together.
  const due = facts.due?.value;
  if (!due) add("time", "Time left", "caution", "No due date was found.");
  else if (isPast(due, day)) add("time", "Time left", "block", `Closed ${fmtWhen(due)}.`);
  else {
    const days = daysUntil(due, day);
    const left = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    add("time", "Time left", days < 7 ? "caution" : "ok", days < 7 ? `Due ${left}. That is short notice.` : `Due ${left}.`);
  }

  const verdict: Verdict = reasons.some((reason) => reason.level === "block") ? "no" : reasons.some((reason) => reason.level === "caution") ? "check" : "good";
  return { verdict, reasons };
}
