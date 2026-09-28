"use client";

import { useActionState, useSyncExternalStore } from "react";
import { bootstrapGoogleReviewsAction } from "./actions";

const subscribe = () => () => {};
function useReady() { return useSyncExternalStore(subscribe, () => true, () => false); }

export function HomeReviewsBootstrapControl({ generation, revision }: { generation: number; revision: string }) {
  const [state, action, pending] = useActionState(bootstrapGoogleReviewsAction, { ok: false, message: "" });
  const ready = useReady();
  return <form action={action} className="grid gap-3 rounded-2xl border theme-card p-5" dir="rtl">
    <p>הטיוטה נוצרה לפני הוספת תמיכה בביקורות Google. הפעולה תוסיף לה בלוק מוסתר בלבד, ללא פרסום.</p>
    <input type="hidden" name="generation" value={generation} />
    <input type="hidden" name="revision" value={revision} />
    <button type="submit" className="btn-primary justify-self-start" disabled={pending || !ready}>
      הוספת בלוק ביקורות Google
    </button>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </form>;
}
