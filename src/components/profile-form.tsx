"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { EffectiveFacts } from "@/lib/effective";
import { VERDICT_LABEL, assessFit } from "@/lib/fit";
import { BONDING_OPTIONS, CERT_OPTIONS, LICENCE_OPTIONS, NAICS_OPTIONS, RADIUS_OPTIONS, fmtDollars, type Profile } from "@/lib/profile";
import { saveProfileAction } from "@/server/actions";
import { fitNote } from "./cards";
import { VerdictMark } from "./ui";

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

  const group = (legend: string, list: Listed, options: readonly { code: string; label: string }[]) => (
    <fieldset className="sec min-w-0">
      <legend className="subheading float-left w-full">{legend}</legend>
      <div className="clear-both grid gap-2 pt-3">
        {options.map((option) => (
          <label key={option.code} className="choice">
            <input type="checkbox" className="size-5 flex-none accent-accent" checked={draft[list].includes(option.code)} onChange={(event) => toggle(list, option.code, event.target.checked)} />
            <span>
              {option.label}
              {list === "naics" && <span className="font-normal text-muted"> ({option.code})</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const outcomes = items.map((item) => ({ item, before: assessFit(item.facts, item.miles, saved, day), after: assessFit(item.facts, item.miles, draft, day) }));
  const moved = outcomes.filter((outcome) => outcome.before.verdict !== outcome.after.verdict).length;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:gap-9">
      <div>
        <div className="panel">
          {group("Work you take", "naics", NAICS_OPTIONS)}
          {group("Certifications", "certs", CERT_OPTIONS)}
          {group("Utah licenses held", "licences", LICENCE_OPTIONS)}
          <div className="sec grid gap-5 sm:grid-cols-2">
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
        <div className="mt-5 flex flex-wrap items-center gap-3">
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
                <Link href="/" className="quiet">
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

      <section aria-labelledby="effect" className="min-w-0 lg:sticky lg:top-4">
        <h2 id="effect" className="heading">
          What is undecided
        </h2>
        <p className={`mt-1.5 mb-4 ${dirty && moved ? "font-semibold text-accent-deep" : "text-muted"}`} aria-live="polite">
          {dirty ? (moved ? `With these changes, ${moved} ${moved === 1 ? "solicitation comes" : "solicitations come"} out differently. Save to keep them.` : "These changes do not move any solicitation.") : "As the saved rules judge it."}
        </p>
        {outcomes.length > 0 && (
          <ul className="rows">
            {outcomes.map(({ item, before, after }) => {
              const changed = before.verdict !== after.verdict;
              return (
                <li key={item.id} className={`border-line px-5 py-4 transition-colors not-first:border-t ${changed ? "bg-accent-tint" : ""}`}>
                  <Link href={`/solicitations/${item.id}`} className="title-link block leading-snug font-semibold">
                    {item.title}
                  </Link>
                  <div className="mt-1.5">
                    <VerdictMark verdict={after.verdict} note={[changed ? `Was ${VERDICT_LABEL[before.verdict].toLowerCase()}` : null, fitNote({ fit: after, feed: item, eff: item })].filter(Boolean).join(". ") || undefined} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {outcomes.length === 0 && <p className="panel p-5 text-muted">Every solicitation found so far has been decided.</p>}
      </section>
    </div>
  );
}
