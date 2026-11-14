"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/profile";

/** The fictional company's own header: its name, and the places work happens. */
export function SiteHeader() {
  const pathname = usePathname();
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined} className={`border-b-[3px] px-1 py-3 font-bold ${active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-8 px-4 sm:px-6">
        <p className="py-3 text-lg font-extrabold tracking-tight">
          {COMPANY.name} <span className="text-sm font-normal text-muted">{COMPANY.town}</span>
        </p>
        <nav aria-label="Main" className="flex gap-5">
          {tab("/", "Today", pathname === "/")}
          {tab("/pipeline", "Pipeline", pathname.startsWith("/pipeline") || pathname.startsWith("/solicitations"))}
          {tab("/profile", "Company profile", pathname.startsWith("/profile"))}
        </nav>
      </div>
    </header>
  );
}
