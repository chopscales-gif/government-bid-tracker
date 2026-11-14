import { z } from "zod";

/**
 * What the company can take on. The fit rules compare each solicitation with
 * this, so changing it changes which jobs are matches.
 */

export const COMPANY = { name: "Juniper Ridge Mechanical", town: "West Valley City, Utah" };

export const NAICS_OPTIONS = [
  { code: "238220", label: "Plumbing, heating and air-conditioning" },
  { code: "238160", label: "Roofing" },
  { code: "238210", label: "Electrical" },
  { code: "561210", label: "Facilities support services" },
] as const;

export const CERT_OPTIONS = [
  { code: "small_business", label: "Small business" },
  { code: "wosb", label: "Woman-owned small business" },
  { code: "sdvosb", label: "Service-disabled veteran-owned small business" },
  { code: "hubzone", label: "HUBZone" },
  { code: "8a", label: "8(a)" },
] as const;

export const LICENCE_OPTIONS = [
  { code: "S350", label: "S350 HVAC contractor license" },
  { code: "S210", label: "S210 General plumbing contractor license" },
  { code: "S280", label: "S280 Roofing contractor license" },
] as const;

export const RADIUS_OPTIONS = [50, 100, 150, 250] as const;
export const BONDING_OPTIONS = [500_000, 1_500_000, 3_000_000, 5_000_000] as const;

const codes = <T extends readonly { code: string }[]>(options: T) => z.array(z.enum(options.map((option) => option.code) as [string, ...string[]])).max(options.length);

export const profileSchema = z.object({
  naics: codes(NAICS_OPTIONS),
  certs: codes(CERT_OPTIONS),
  licences: codes(LICENCE_OPTIONS),
  /** How far from the yard the crews will travel, in miles. */
  radius: z.union(RADIUS_OPTIONS.map((miles) => z.literal(miles))),
  /** The largest single job the surety will bond, in dollars. */
  bonding: z.union(BONDING_OPTIONS.map((dollars) => z.literal(dollars))),
});

export type Profile = z.infer<typeof profileSchema>;

export const DEFAULT_PROFILE: Profile = {
  naics: ["238220"],
  certs: ["small_business"],
  licences: ["S350", "S210"],
  radius: 100,
  bonding: 1_500_000,
};

/** 450000 as "$450,000", 1500000 as "$1.5 million". */
export function fmtDollars(dollars: number): string {
  if (dollars >= 1_000_000) return `$${Number((dollars / 1_000_000).toFixed(2))} million`;
  return `$${dollars.toLocaleString("en-US")}`;
}
