"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { nextMorningAction } from "@/server/actions";

/** Moves the demo calendar to the next working morning and goes to what the morning check found. */
export function NextMorningButton({ className }: { className: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await nextMorningAction();
      if (!result.ok) setError(result.error);
      else router.push("/");
    });
  }

  return (
    <>
      <button type="button" onClick={onClick} disabled={pending} className={className}>
        {pending ? "Checking the feeds" : "Skip to next morning"}
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm">
          {error}
        </p>
      )}
    </>
  );
}
