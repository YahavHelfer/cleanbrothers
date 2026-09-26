"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createNewPageAction, duplicateNewPageAction, newPageAction,
  type NewPageActionState } from "./new-actions";
import type { NewPageSnapshot } from "./new-repository";

const initial: NewPageActionState = { ok: false, message: "" };
const input = "field w-full";
export function NewPageCreateForm() {
  const [state, action, pending] = useActionState(createNewPageAction, initial);
  const router = useRouter();
  useEffect(() => { if (state.ok && state.pageId) router.push(`/admin/pages/${state.pageId}`); },[state,router]);
  return <form action={action} className="grid gap-4 rounded-2xl border theme-card p-5" dir="rtl">
    <h2 className="text-xl font-black">עמוד חדש</h2>
    <label>שם העמוד<input className={input} name="title" required maxLength={120} /></label>
    <label>כתובת העמוד<input className={input} name="slug" required minLength={3} maxLength={64}
      pattern="[a-z0-9]+(-[a-z0-9]+)*" dir="ltr" placeholder="new-page" /></label>
    <label>תבנית<select className={input} name="template" defaultValue="standard">
      <option value="blank">עמוד ריק</option><option value="standard">עמוד תוכן רגיל</option>
      <option value="promotion">עמוד נחיתה עם מבצע</option></select></label>
    <p>יצירה שומרת טיוטה בלבד. פרסום אינו מוסיף את העמוד אוטומטית לתפריט האתר.</p>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
    <button className="btn-primary justify-self-start" disabled={pending}>יצירת טיוטה</button>
  </form>;
}
export function NewPageDuplicateForm({ source }: { source: string }) {
  const [state, action, pending] = useActionState(duplicateNewPageAction.bind(null,source),initial);
  const router = useRouter();
  useEffect(() => { if (state.ok && state.pageId) router.push(`/admin/pages/${state.pageId}`); },[state,router]);
  return <form action={action} className="grid gap-3 rounded-2xl border theme-card p-5" dir="rtl">
    <h2 className="text-lg font-black">שכפל עמוד</h2>
    <label>שם העותק<input className={input} name="title" required maxLength={120} /></label>
    <label>כתובת חדשה<input className={input} name="slug" required minLength={3} maxLength={64}
      pattern="[a-z0-9]+(-[a-z0-9]+)*" dir="ltr" /></label>
    <p>העותק מקבל זהות והיסטוריה נפרדות. הוא מתחיל ללא פרסום.</p>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
    <button className="btn-secondary justify-self-start" disabled={pending}>שכפל עמוד</button>
  </form>;
}
export function NewPageLifecycleForm({ snapshot, kind, label }: { snapshot: NewPageSnapshot;
  kind: "unpublish" | "archive" | "restore-archive"; label: string }) {
  const [state, action, pending] = useActionState(newPageAction.bind(null,snapshot.documentId),initial);
  return <form action={action} className="grid gap-3 rounded-2xl border theme-card p-5" dir="rtl">
    <input type="hidden" name="generation" value={snapshot.generation} />
    <h2 className="text-lg font-black">{label}</h2>
    <label className="flex gap-2"><input type="checkbox" name="confirmLifecycle" value="yes" required />אני מאשר/ת את הפעולה</label>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
    <button className="btn-secondary justify-self-start" name="intent" value={kind} disabled={pending}>{label}</button>
  </form>;
}
