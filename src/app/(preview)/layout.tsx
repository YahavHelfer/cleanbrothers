import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "../globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "תצוגה מקדימה | CleanBrothers",
  robots: { index: false, follow: false },
};

// Reserved boundary only: no preview page, draft reader, or bypass endpoint yet.
// Future preview routes must authorize access before reading unpublished content.
export default function PreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
