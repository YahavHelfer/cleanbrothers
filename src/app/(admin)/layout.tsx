import { mediaLocalEnabled } from "@/cms/media/environment";
import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Link from "next/link";
import "../globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "אזור הניהול | CleanBrothers",
  robots: { index: false, follow: false },
};

// A separate root layout prevents public marketing code from mounting here.
// Login shares this shell; protected descendants enforce authorization separately.
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <a href="#admin-content" className="sr-only focus:not-sr-only focus:block focus:p-4">
          דילוג לתוכן הניהול
        </a>
        <header className="border-b theme-card">
          <div className="section-container flex flex-wrap items-center justify-between gap-4 py-5">
            <p className="text-lg font-black">CleanBrothers CMS</p>
            <nav aria-label="ניווט ניהול" className="flex items-center gap-5 text-sm font-bold">
              <Link href="/admin/services" prefetch={false}>שירותים</Link>
              {mediaLocalEnabled() && <Link href="/admin/media" prefetch={false}>מדיה</Link>}
              <Link href="/admin" prefetch={false} className="rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise">
                לוח בקרה
              </Link>
            </nav>
          </div>
        </header>
        <main id="admin-content" className="section-container py-10 sm:py-16">
          {children}
        </main>
      </body>
    </html>
  );
}
