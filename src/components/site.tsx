"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/profile";

/** The fictional company's own header: its name, and the places work happens. */
export function SiteHeader() {
  const pathname = usePathname();
  const tab = (href: string, label: React.ReactNode, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center font-medium whitespace-nowrap transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}>
      {label}
    </Link>
  );
  return (
    <header>
      <div className="mx-auto flex max-w-[62rem] flex-wrap items-center gap-x-3 px-5 pt-4 sm:pt-5">
        <span aria-hidden className="grid size-[2.125rem] flex-none place-items-center rounded-[0.5625rem] bg-accent font-bold text-white">
          {COMPANY.name.charAt(0)}
        </span>
        <p className="font-semibold">{COMPANY.name}</p>
        <nav aria-label="Main" className="flex gap-6 max-sm:basis-full sm:ml-auto">
          {tab("/", "Today", pathname === "/" || pathname.startsWith("/filtered"))}
          {tab("/pipeline", "Pipeline", pathname.startsWith("/pipeline") || pathname.startsWith("/dates"))}
          {tab("/profile", "Company profile", pathname.startsWith("/profile"))}
        </nav>
      </div>
    </header>
  );
}
