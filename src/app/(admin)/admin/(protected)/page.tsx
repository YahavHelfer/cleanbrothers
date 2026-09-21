import { getCmsDashboard } from "@/cms/dashboard";
import { logout } from "../actions";

export default async function AdminPage() {
  const { admin } = await getCmsDashboard();
  return (
    <section aria-labelledby="admin-title" className="mx-auto max-w-3xl rounded-3xl border theme-card p-6 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm theme-muted">מחובר/ת כמנהל/ת: <bdi>{admin.email || "מנהל/ת האתר"}</bdi></p>
        <form action={logout}>
          <button className="rounded-xl border px-5 py-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise">יציאה מהמערכת</button>
        </form>
      </div>
      <h1 id="admin-title" className="mt-6 text-3xl font-black leading-tight sm:text-4xl">לוח הבקרה</h1>
      <p className="mt-5 leading-8 theme-muted">הכניסה לאזור הניהול מאובטחת. מודולי ניהול התוכן עדיין בפיתוח; בשלב זה אין אפשרות לערוך או לפרסם תוכן.</p>
      <p className="mt-4 text-sm leading-7 theme-muted">האתר הציבורי ממשיך לפעול כרגיל.</p>
    </section>
  );
}
