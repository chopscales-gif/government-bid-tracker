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
export function DemoBar({ today, canAdvance }: { today: string | null; canAdvance: boolean }) {
  return (
    <div className="demo-chrome bg-ink text-sm text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        <p className="min-w-0 flex-1 basis-72 leading-snug">
          <strong className="font-bold">Demonstration build.</strong>{" "}
          <span className="text-white/75">A fictional contractor, invented agencies and solicitations. The AI readings were recorded ahead of time.</span>
        </p>
        <Link href="/about" className="font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white">
          How this demo works
        </Link>
        {today && (
          <form action={resetDemoAction}>
            <ResetButton />
          </form>
        )}
      </div>
      {today && (
        <div className="border-t border-white/15 bg-white/5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
            <p className="min-w-0 flex-1 basis-64">
              <span className="text-white/75">In the demo it is 7:00 AM on</span> <strong className="font-bold">{today}</strong>
            </p>
            {canAdvance ? (
              <NextMorningButton className="cursor-pointer rounded bg-white px-3 py-1.5 font-bold text-ink hover:bg-white/85 disabled:opacity-60" />
            ) : (
              <p className="text-white/75">The demo calendar ends here. Reset to start again.</p>
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
    <button type="submit" disabled={pending} className="cursor-pointer rounded border border-white/30 px-3 py-1.5 font-semibold hover:border-white disabled:opacity-60">
      {pending ? "Resetting" : "Reset demo"}
    </button>
  );
}
