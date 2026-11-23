import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[62rem] flex-1 px-5 py-12 lg:py-20">
      <h1 className="display">That page is not here</h1>
      <p className="mt-5 max-w-[40rem] text-lg leading-relaxed text-muted">If you followed a link to a solicitation, it belonged to a copy of the demo that has since been reset, or the demo calendar has not reached it yet.</p>
      <Link href="/" className="btn btn-primary mt-8">
        Open Today
      </Link>
    </main>
  );
}
