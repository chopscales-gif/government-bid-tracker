"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/profile";

/** The fictional company's own header: its name, and the places work happens, as the tabs of a folder. */
export function SiteHeader() {
  const pathname = usePathname();
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`narrow -mb-px flex min-h-11 items-center rounded-t-md border border-b-0 px-3 text-[1.0625rem] font-bold whitespace-nowrap sm:px-5 ${
        active ? "border-edge bg-paper text-ink" : "border-transparent text-ink hover:bg-paper/50"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b border-edge bg-kraft">
      <div className="mx-auto flex max-w-[86rem] flex-wrap items-end justify-between gap-x-8 px-4 sm:px-6 lg:px-8">
        <p className="py-3 leading-none">
          <span className="narrow block text-[1.375rem] font-extrabold">{COMPANY.name}</span>
          <span className="mt-1 block text-sm">Bid desk, {COMPANY.town}</span>
        </p>
        <nav aria-label="Main" className="flex gap-1 pt-1">
          {tab("/", "Today", pathname === "/")}
          {tab("/pipeline", "Pipeline", pathname.startsWith("/pipeline"))}
          {tab("/profile", "Company profile", pathname.startsWith("/profile"))}
        </nav>
      </div>
    </header>
  );
}
