import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="display">That page is not here</h1>
      <p className="mt-4 max-w-[40rem] text-lg leading-relaxed">If you followed a link to a solicitation, it belonged to a copy of the demo that has since been reset, or the demo calendar has not reached it yet.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Open Today
      </Link>
    </main>
  );
}
