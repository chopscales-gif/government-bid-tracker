"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { EffectiveFacts } from "@/lib/effective";
import { VERDICT_LABEL, assessFit } from "@/lib/fit";
import { BONDING_OPTIONS, CERT_OPTIONS, LICENCE_OPTIONS, NAICS_OPTIONS, RADIUS_OPTIONS, fmtDollars, type Profile } from "@/lib/profile";
import { saveProfileAction } from "@/server/actions";
import { ReasonList, VerdictChip } from "./ui";

type Item = { id: string; title: string; agency: string; facts: EffectiveFacts; miles: number };
type Listed = "naics" | "certs" | "licences";

/**
 * The settings the fit rules read. The same rules run here in the browser on
 * the settings as they are being changed, so the effect shows before saving.
 */
export function ProfileForm({ saved, items, day }: { saved: Profile; items: Item[]; day: number }) {
  const [draft, setDraft] = useState(saved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function change(next: Profile) {
    setDraft(next);
    setDone(false);
  }
  const toggle = (list: Listed, code: string, on: boolean) => change({ ...draft, [list]: on ? [...draft[list], code] : draft[list].filter((held) => held !== code) });

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveProfileAction(draft);
      if (!result.ok) setError(result.error);
      else setDone(true);
    });
  }

  const group = (legend: string, hint: string, list: Listed, options: readonly { code: string; label: string }[], columns = false) => (
    <fieldset className="sec min-w-0">
      <legend className="subheading float-left w-full">{legend}</legend>
      <p className="clear-both pt-1 text-sm text-muted">{hint}</p>
      <div className={`mt-2 ${columns ? "gap-x-6 sm:columns-2" : ""}`}>
        {options.map((option) => (
          <label key={option.code} className="flex min-h-11 cursor-pointer break-inside-avoid items-center gap-3 leading-snug">
            <input type="checkbox" className="size-5 flex-none accent-accent" checked={draft[list].includes(option.code)} onChange={(event) => toggle(list, option.code, event.target.checked)} />
            <span>
              {option.label}
              {list === "naics" && <span className="text-muted"> ({option.code})</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const outcomes = items.map((item) => ({ item, before: assessFit(item.facts, item.miles, saved, day), after: assessFit(item.facts, item.miles, draft, day) }));
  const moved = outcomes.filter((outcome) => outcome.before.verdict !== outcome.after.verdict).length;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-8 xl:gap-10">
      <div>
        <div className="panel">
          {group("Work you take", "The kinds of work, by NAICS code, you want to see.", "naics", NAICS_OPTIONS)}
          {group("Certifications", "A job set aside for one kind of business is only a match if you hold that certification.", "certs", CERT_OPTIONS, true)}
          {group("Licenses held", "Utah contractor licenses.", "licences", LICENCE_OPTIONS, true)}
          <div className="sec grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="radius" className="subheading block">
                How far you travel
              </label>
              <select id="radius" className="field mt-2" value={draft.radius} onChange={(event) => change({ ...draft, radius: Number(event.target.value) as Profile["radius"] })}>
                {RADIUS_OPTIONS.map((miles) => (
                  <option key={miles} value={miles}>
                    Up to {miles} miles
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bonding" className="subheading block">
                Largest job you can bond
              </label>
              <select id="bonding" className="field mt-2" value={draft.bonding} onChange={(event) => change({ ...draft, bonding: Number(event.target.value) as Profile["bonding"] })}>
                {BONDING_OPTIONS.map((dollars) => (
                  <option key={dollars} value={dollars}>
                    {fmtDollars(dollars)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={!dirty || pending} onClick={save}>
            {pending ? "Saving" : "Save profile"}
          </button>
          {dirty && !pending && (
            <button type="button" className="btn btn-quiet w-full sm:w-auto" onClick={() => change(saved)}>
              Undo changes
            </button>
          )}
          <p role="status" className="basis-full sm:basis-auto">
            {done && !dirty ? (
              <>
                Saved.{" "}
                <Link href="/" className="link">
                  See Today with the new profile
                </Link>
              </>
            ) : null}
          </p>
          {error && (
            <p role="alert" className="basis-full text-sm font-semibold text-flag">
              {error}
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="effect" className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
        <h2 id="effect" className="heading">
          How the undecided solicitations come out
        </h2>
        <p className={`mt-1 ${dirty && moved ? "font-bold text-accent-deep" : "text-muted"}`} aria-live="polite">
          {dirty ? (moved ? `With these changes, ${moved} ${moved === 1 ? "solicitation comes" : "solicitations come"} out differently. Save to keep them.` : "These changes do not move any solicitation.") : "With the profile as saved."}
        </p>
        {outcomes.length > 0 && (
          <ul className="panel mt-3">
            {outcomes.map(({ item, before, after }) => {
              const changed = before.verdict !== after.verdict;
              return (
                <li key={item.id} className={`border-line px-4 py-3.5 not-first:border-t sm:px-5 ${changed ? "bg-mark shadow-[inset_4px_0_0_var(--color-accent)]" : ""}`}>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <VerdictChip verdict={after.verdict} />
                    {changed && <span className="text-sm font-semibold">was {VERDICT_LABEL[before.verdict].toLowerCase()}</span>}
                  </p>
                  <p className="narrow text-lg leading-snug font-bold">
                    <Link href={`/solicitations/${item.id}`} className="title-link block pt-3 pb-2">
                      {item.title}
                    </Link>
                  </p>
                  <p className="text-sm text-muted">{item.agency}</p>
                  {after.verdict !== "good" && (
                    <div className="mt-2 text-[0.9375rem]">
                      <ReasonList reasons={after.reasons} only={["block", "caution"]} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {outcomes.length === 0 && <p className="panel mt-3 p-4">Every solicitation found so far has been decided.</p>}
      </section>
    </div>
  );
}
