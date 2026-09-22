import Link from "next/link";
import { getPilotEditor } from "@/cms/content/repository";
import { PILOT_KEY } from "@/cms/content/pilot-model";

export default async function ServicesPage() {
  const { snapshot } = await getPilotEditor();
  return <section className="grid gap-6">
    <h1 className="text-3xl font-black">ניהול שירותים</h1>
    <p>ריפודים עדינים הוא השירות היחיד הניתן לעריכה בשלב זה. שאר השירותים נשארים בתוכן הקיים.</p>
    {snapshot ? <article className="grid gap-4 rounded-3xl border theme-card p-6">
      <h2 className="text-xl font-black">{snapshot.draft.publicTitle}</h2>
      <p>פורסם: גרסה {snapshot.history.find((r) => r.id === snapshot.publishedRevisionId)?.number}</p>
      <p>טיוטה: גרסה {snapshot.history.find((r) => r.id === snapshot.draftRevisionId)?.number}</p>
      <p>{snapshot.draftRevisionId === snapshot.publishedRevisionId ? "הטיוטה תואמת לגרסה שפורסמה" : "יש שינויים שלא פורסמו"}</p>
      <p>נשמר לאחרונה: <time dateTime={snapshot.updatedAt}>{new Date(snapshot.updatedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</time></p>
      <Link href={`/admin/services/${PILOT_KEY}`} prefetch={false} className="btn-primary justify-self-start">עריכת השירות</Link>
    </article> : <p>השירות עדיין לא יובא לסביבה המקומית.</p>}
  </section>;
}
