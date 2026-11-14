import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import { DemoBar } from "@/components/demo-bar";
import { SiteHeader } from "@/components/site";
import { MAX_DAY, ZONE, fmtLongDay } from "@/lib/calendar";
import { getCtx, sandboxIdOrNull } from "@/server/session";
import { loadSandbox } from "@/server/workflow";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public", subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Government bid tracker (demo)", template: "%s | Government bid tracker (demo)" },
  description:
    "A demonstration build by ChopMedia: government solicitations matched to a contractor, read by AI into a checklist that cites the page, and watched for addenda. Fictional company, invented agencies and solicitations.",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // No cookie means the proxy is showing the page about cookies, and there is no calendar to show.
  const day = (await sandboxIdOrNull()) === null ? null : (await loadSandbox(await getCtx())).day;
  return (
    <html lang="en" className={`${publicSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DemoBar zone={ZONE.name} today={day === null ? null : fmtLongDay(day)} canAdvance={day !== null && day < MAX_DAY} />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
