"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="mt-7 space-y-5">
      <div>
        <label htmlFor="cms-email" className="mb-2 block font-bold">כתובת אימייל</label>
        <input id="cms-email" name="email" type="email" dir="ltr" autoComplete="username" required maxLength={254} disabled={disabled || pending} className="w-full rounded-xl border theme-card px-4 py-3 text-start focus-visible:outline-2 focus-visible:outline-turquoise" />
      </div>
      <div>
        <label htmlFor="cms-password" className="mb-2 block font-bold">סיסמה</label>
        <input id="cms-password" name="password" type="password" dir="ltr" autoComplete="current-password" required maxLength={1024} disabled={disabled || pending} className="w-full rounded-xl border theme-card px-4 py-3 text-start focus-visible:outline-2 focus-visible:outline-turquoise" />
      </div>
      {state.error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm leading-7 text-red-900">{state.error}</p> : null}
      <button type="submit" disabled={disabled || pending} className="w-full rounded-xl bg-turquoise-dark px-5 py-3 font-bold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-turquoise">{pending ? "מתחבר…" : "כניסה למערכת"}</button>
    </form>
  );
}
