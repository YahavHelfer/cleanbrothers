export default function AdminPage() {
  return (
    <section aria-labelledby="admin-title" className="mx-auto max-w-3xl rounded-3xl border theme-card p-6 shadow-sm sm:p-10">
      <p className="text-sm font-bold text-turquoise-dark">ניהול האתר</p>
      <h1 id="admin-title" className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
        אזור הניהול נמצא בפיתוח
      </h1>
      <p className="mt-5 text-base leading-8 theme-muted">
        בהמשך יהיה אפשר לנהל כאן את תוכן האתר. בשלב זה אין כניסה לחשבון או אפשרות לערוך ולפרסם תוכן.
      </p>
      <p className="mt-4 text-sm leading-7 theme-muted">
        האתר הציבורי ממשיך לפעול כרגיל.
      </p>
    </section>
  );
}
