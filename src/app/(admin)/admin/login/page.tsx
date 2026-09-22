import { redirect } from "next/navigation";
import { CmsAccessError, requireCmsMemberForOnboarding } from "@/cms/authorization";
import { cmsStepDestination } from "@/cms/onboarding";
import { LoginForm } from "./LoginForm";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  let destination: string | undefined;
  let denied = false;
  let unavailable = false;
  try {
    destination = cmsStepDestination((await requireCmsMemberForOnboarding()).step);
  } catch (error) {
    denied = error instanceof CmsAccessError && error.reason === "forbidden";
    unavailable = !(error instanceof CmsAccessError) || error.reason === "unavailable";
  }
  if (destination) redirect(destination);
  return (
    <section aria-labelledby="login-title" className="mx-auto max-w-md rounded-3xl border theme-card p-6 shadow-sm sm:p-10">
      <p className="text-sm font-bold text-turquoise-dark">אזור מנהלים</p>
      <h1 id="login-title" className="mt-3 text-3xl font-black">כניסה לניהול האתר</h1>
      <p className="mt-4 text-sm leading-7 theme-muted">הכניסה מיועדת למנהלי האתר המורשים בלבד.</p>
      {query.error === "invite" ? <p role="alert" className="mt-5 rounded-xl border p-4 text-sm">לא ניתן לאשר את ההזמנה. פנו לאחראי המערכת לקבלת הזמנה תקפה.</p> : null}
      {denied ? <p role="alert" className="mt-5 rounded-xl border p-4 text-sm">לחשבון זה אין הרשאת גישה לניהול האתר.</p> : null}
      {unavailable ? <p role="alert" className="mt-5 rounded-xl border p-4 text-sm">הכניסה אינה זמינה כרגע. נסו שוב מאוחר יותר.</p> : null}
      <LoginForm disabled={unavailable} />
      {denied ? <form action={logout} className="mt-5"><button className="rounded underline underline-offset-4">יציאה מהחשבון</button></form> : null}
    </section>
  );
}
