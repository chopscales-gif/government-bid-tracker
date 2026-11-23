"use client";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5 py-12 lg:py-20">
      <h1 className="display">This page did not load</h1>
      <p className="mt-5 max-w-[40rem] text-lg leading-relaxed text-muted">
        Try again. If it keeps happening, use Reset demo in the bar at the top to start from a fresh copy of the sample data. This demo needs cookies
        turned on to keep your copy separate from other visitors.
      </p>
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-8">
        Try again
      </button>
    </main>
  );
}
