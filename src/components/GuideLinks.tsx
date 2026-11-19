import Link from "next/link";
import { guideSummaries } from "@/content/guide-routes";

const labels = {
  ac: "מדריכים בנושא ניקוי מזגנים",
  sofa: "מדריכים לניקוי ספות",
  property: "מדריכים לניקיון אחרי שיפוץ ולפני אכלוס",
};

export function GuideLinks({ topic = "ac" }: { topic?: keyof typeof labels }) {
  return <nav aria-label={labels[topic]} className="section-container py-8">
    <div className="rounded-2xl border theme-card p-5 sm:p-7">
      <h3 className="text-lg font-black">{topic === "sofa" ? labels.sofa : "מידע שיעזור לבחור את הניקוי המתאים"}</h3>
      <ul className="mt-3 grid gap-3 leading-7">
        {guideSummaries.filter(guide => guide.topic === topic).map(guide => <li key={guide.slug}>
          <Link className="font-bold text-turquoise-dark underline underline-offset-4" href={`/${guide.slug}`}>{guide.title}</Link>
          {topic === "sofa" && <p className="text-sm">{guide.description}</p>}
        </li>)}
      </ul>
      <Link className="mt-4 inline-flex font-bold underline underline-offset-4" href="/guides">לכל המדריכים</Link>
    </div>
  </nav>;
}
