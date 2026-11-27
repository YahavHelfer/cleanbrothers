import Link from "next/link";
import { publishedLocalAcLinks } from "@/content/local-ac-pilot";

export function PublishedAcCityLinks() {
  if (!publishedLocalAcLinks.length) return null;

  return (
    <nav aria-label="ניקוי מזגנים לפי עיר" className="section-container flex flex-wrap gap-4 py-6">
      {publishedLocalAcLinks.map(({ name, path }) => (
        <Link key={path} className="underline" href={path}>ניקוי מזגנים ב{name}</Link>
      ))}
    </nav>
  );
}
