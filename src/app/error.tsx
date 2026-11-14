"use client";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="display">This page did not load</h1>
      <p className="mt-4 max-w-[40rem] text-lg leading-relaxed">
        Try again. If it keeps happening, use Reset demo in the bar at the top to start from a fresh copy of the sample data. This demo needs cookies
        turned on to keep your copy separate from other visitors.
      </p>
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-6">
        Try again
      </button>
    </main>
  );
}
