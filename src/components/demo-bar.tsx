"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { resetDemoAction } from "@/server/actions";
import { NextMorningButton } from "./next-morning";
import { TourButton } from "./tour";

/**
 * The one line across the top of every page. It is the only part of the
 * screen that belongs to the demo rather than to the fictional company's
 * product: the way back to the other demos, the notice, and the demo's calendar.
 */
export function DemoBar({ today, canAdvance }: { today: string | null; canAdvance: boolean }) {
  return (
    <div className="demo-chrome border-b border-line text-sm text-muted">
      <div className="mx-auto flex max-w-[84rem] flex-wrap items-center gap-x-5 gap-y-1 px-5 py-2.5">
        <a href="https://chopmedia.vercel.app/#government-bids" className="quiet whitespace-nowrap">
          ← All demos
        </a>
        <p className="min-w-0 leading-snug">
          <strong className="font-semibold text-ink">Demonstration build.</strong> Invented company and agencies. AI readings are recorded.
        </p>
        <div className="flex flex-wrap items-center gap-x-[1.125rem] gap-y-1 xl:ml-auto">
          {today && <span className="whitespace-nowrap">{today}, 7:00 AM</span>}
          {today && (canAdvance ? <NextMorningButton className="quiet whitespace-nowrap" /> : <span>The demo calendar ends here.</span>)}
          {today && <TourButton />}
          <Link href="/about" className="quiet whitespace-nowrap">
            How it works
          </Link>
          {today && (
            <form action={resetDemoAction} className="flex">
              <ResetButton />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="quiet whitespace-nowrap">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
