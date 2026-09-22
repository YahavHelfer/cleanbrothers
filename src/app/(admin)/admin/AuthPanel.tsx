import { logout } from "./actions";

export function AuthPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mx-auto max-w-md rounded-3xl border theme-card p-6 shadow-sm sm:p-10">
    <p className="text-sm font-bold text-turquoise-dark">אזור מנהלים</p>
    <h1 className="mt-3 text-3xl font-black">{title}</h1>
    <div className="mt-5 space-y-5 text-sm leading-7">{children}</div>
    <form action={logout} className="mt-7 border-t pt-5"><button className="rounded underline underline-offset-4">יציאה מהחשבון</button></form>
  </section>;
}
