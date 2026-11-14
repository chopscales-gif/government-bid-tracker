"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { resetDemoAction } from "@/server/actions";
import { NextMorningButton } from "./next-morning";

/**
 * The strip across the top of every page. It is the only part of the screen
 * that belongs to the demo rather than to the fictional company's product,
 * and it holds the demo's calendar.
 */
export function DemoBar({ today, zone, canAdvance }: { today: string | null; zone: string; canAdvance: boolean }) {
  return (
    <div className="demo-chrome bg-ink text-sm text-white">
      <div className="mx-auto flex max-w-[86rem] items-center gap-x-4 gap-y-2 px-4 py-1 sm:flex-wrap sm:gap-x-5 sm:px-6 sm:py-2 lg:px-8">
        {/* A phone gets the short form: the sentence would cost it a quarter of the first screen. */}
        <p className="min-w-0 flex-1 leading-snug sm:basis-72">
          <strong className="font-bold">
            Demonstration build<span className="max-sm:hidden">.</span>
          </strong>{" "}
          <span className="text-white/75 max-sm:hidden">A fictional contractor, invented agencies and solicitations. The AI readings were recorded ahead of time.</span>
        </p>
        <Link href="/about" aria-label="How this demo works" className="inline-flex min-h-11 items-center font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white sm:min-h-0">
          <span className="sm:hidden">How it works</span>
          <span className="max-sm:hidden">How this demo works</span>
        </Link>
        {today && (
          <form action={resetDemoAction}>
            <ResetButton />
          </form>
        )}
      </div>
      {today && (
        <div className="border-t border-white/15 bg-white/5">
          <div className="mx-auto flex max-w-[86rem] items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-wrap sm:px-6 lg:px-8">
            <p className={`min-w-0 leading-snug sm:flex-1 sm:basis-64 ${canAdvance ? "flex-1" : "max-sm:flex-none"}`}>
              <span className="text-white/75 sm:hidden">All invented. Demo date:</span>
              <span className="text-white/75 max-sm:hidden">In the demo it is 7:00 AM {zone} on</span>{" "}
              <strong className="font-bold max-sm:block">{today}</strong>
            </p>
            {canAdvance ? (
              <NextMorningButton className="min-h-11 flex-none cursor-pointer rounded-[3px] bg-white px-4 font-bold text-ink hover:bg-paper disabled:opacity-60 sm:min-h-9" />
            ) : (
              <p className="min-w-0 leading-snug text-white/75 max-sm:flex-1 max-sm:text-right">The demo calendar ends here. Reset to start again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-11 flex-none cursor-pointer rounded-[3px] border border-white/40 px-3 font-semibold hover:border-white disabled:opacity-60 sm:min-h-9">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
