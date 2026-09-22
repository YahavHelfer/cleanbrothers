"use client";

import { useActionState } from "react";
import { verifyCmsTotp } from "../onboarding-actions";

export function VerifyForm({ factorId }: { factorId: string }) {
  const [state, action, pending] = useActionState(verifyCmsTotp, { error: "" });
  return <form action={action} className="space-y-4">
    <input type="hidden" name="factorId" value={factorId} />
    <label htmlFor="cms-code" className="block font-bold">קוד אימות</label>
    <input id="cms-code" name="code" type="text" dir="ltr" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" required disabled={pending} className="w-full rounded-xl border theme-card px-4 py-3 text-center text-xl tracking-widest focus-visible:outline-2 focus-visible:outline-turquoise" />
    {state.error ? <p role="alert" className="rounded-xl border p-4">{state.error}</p> : null}
    <button disabled={pending} className="w-full rounded-xl bg-turquoise-dark px-5 py-3 font-bold text-white disabled:opacity-60">{pending ? "מאמת…" : "אימות והמשך"}</button>
  </form>;
}
