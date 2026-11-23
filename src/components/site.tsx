"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/profile";

/** The fictional company's own header: its name, and the places work happens. */
export function SiteHeader() {
  const pathname = usePathname();
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-full px-3.5 text-[1.0625rem] font-semibold whitespace-nowrap transition-colors sm:px-5 ${
        active ? "bg-accent-tint text-accent-deep" : "text-muted hover:bg-stone hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[86rem] flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-3 sm:px-6 lg:px-8">
        <p className="flex items-center gap-3 leading-none">
          <span aria-hidden className="grid size-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-[#6258e6] to-accent-deep text-lg font-bold text-white shadow-rest">
            {COMPANY.name.charAt(0)}
          </span>
          <span>
            <span className="block text-[1.1875rem] font-bold tracking-[-0.02em]">{COMPANY.name}</span>
            <span className="mt-1 block text-sm text-muted">Bid desk, {COMPANY.town}</span>
          </span>
        </p>
        <nav aria-label="Main" className="-mx-1.5 flex gap-1 sm:mx-0">
          {tab("/", "Today", pathname === "/")}
          {tab("/pipeline", "Pipeline", pathname.startsWith("/pipeline"))}
          {tab("/profile", "Company profile", pathname.startsWith("/profile"))}
        </nav>
      </div>
    </header>
  );
}
