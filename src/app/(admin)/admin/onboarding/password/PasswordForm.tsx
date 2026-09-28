"use client";

import { useActionState } from "react";
import { setCmsInitialPassword } from "../../onboarding-actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(setCmsInitialPassword, { error: "" });
  return <form action={action} className="space-y-4">
    <p id="password-help">בחרו סיסמה אישית בת 12–128 תווים, הכוללת אות גדולה וקטנה באנגלית, מספר וסימן מיוחד.</p>
    {[["password", "סיסמה חדשה"], ["confirmPassword", "אימות הסיסמה"]].map(([name, label]) => <div key={name}>
      <label htmlFor={`cms-${name}`} className="mb-2 block font-bold">{label}</label>
      <input id={`cms-${name}`} name={name} type="password" dir="ltr" autoComplete="new-password" aria-describedby="password-help" minLength={12} maxLength={128} required disabled={pending} className="w-full rounded-xl border theme-card px-4 py-3 focus-visible:outline-2 focus-visible:outline-turquoise" />
    </div>)}
    {state.error ? <p role="alert" className="rounded-xl border p-4">{state.error}</p> : null}
    <button disabled={pending} className="w-full rounded-xl bg-turquoise-dark px-5 py-3 font-bold text-white disabled:opacity-60">{pending ? "שומר…" : "שמירת סיסמה והמשך"}</button>
  </form>;
}
