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
    <div className="demo-chrome border-b border-edge bg-stone text-sm">
      <div className="mx-auto flex max-w-[86rem] items-center gap-x-4 gap-y-2 px-4 py-1 sm:flex-wrap sm:gap-x-5 sm:px-6 sm:py-2 lg:px-8">
        {/* A phone gets the short form: the sentence would cost it a quarter of the first screen. */}
        <p className="min-w-0 flex-1 leading-snug sm:basis-72">
          <strong className="font-bold">
            Demonstration build<span className="max-sm:hidden">.</span>
          </strong>{" "}
          <span className="text-muted max-sm:hidden">A fictional contractor, invented agencies and solicitations. The AI readings were recorded ahead of time.</span>
        </p>
        <Link href="/about" aria-label="How this demo works" className="link inline-flex min-h-11 items-center sm:min-h-0">
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
        <div className="border-t border-edge/70 bg-paper/70">
          <div className="mx-auto flex max-w-[86rem] items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-wrap sm:px-6 lg:px-8">
            <p className={`min-w-0 leading-snug sm:flex-1 sm:basis-64 ${canAdvance ? "flex-1" : "max-sm:flex-none"}`}>
              <span className="text-muted sm:hidden">All invented. Demo date:</span>
              <span className="text-muted max-sm:hidden">In the demo it is 7:00 AM {zone} on</span>{" "}
              <strong className="font-bold max-sm:block">{today}</strong>
            </p>
            {canAdvance ? (
              <NextMorningButton className="min-h-11 flex-none cursor-pointer rounded-full bg-ink px-5 font-semibold text-white shadow-rest transition-colors hover:bg-accent-deep disabled:opacity-60 sm:min-h-9" />
            ) : (
              <p className="min-w-0 leading-snug text-muted max-sm:flex-1 max-sm:text-right">The demo calendar ends here. Reset to start again.</p>
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
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 flex-none cursor-pointer rounded-full border border-edge bg-surface px-4 font-semibold transition-colors hover:border-faint disabled:opacity-60 sm:min-h-9"
    >
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
