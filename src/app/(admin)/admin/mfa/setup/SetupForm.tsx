"use client";

import { useActionState } from "react";
import { enrollCmsTotp } from "../../onboarding-actions";
import { VerifyForm } from "../VerifyForm";

export function SetupForm() {
  const [state, action, pending] = useActionState(enrollCmsTotp, { error: "" });
  if (state.factorId && state.qrCode) return <div className="space-y-5">
    <p>סרוק את קוד ה־QR באפליקציית המאמת</p>
    {/* A local data image never goes through Next's optimizer or an external QR service. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={state.qrCode} alt="קוד QR להגדרת אימות דו־שלבי" width={240} height={240} className="mx-auto max-w-full rounded-xl bg-white p-3" referrerPolicy="no-referrer" />
    <p className="theme-muted">אין לשתף את הקוד. השלימו את הסריקה לפני יציאה מהעמוד; הקוד לא יוצג שוב לאחר רענון.</p>
    <VerifyForm factorId={state.factorId} />
  </div>;
  return <form action={action} className="space-y-4">
    <p>הכינו אפליקציית מאמת בטלפון. הגישה ללוח הבקרה תתאפשר רק לאחר אימות הקוד.</p>
    {state.error ? <p role="alert" className="rounded-xl border p-4">{state.error}</p> : null}
    <button disabled={pending} className="w-full rounded-xl bg-turquoise-dark px-5 py-3 font-bold text-white disabled:opacity-60">{pending ? "מכין…" : "הצגת קוד QR"}</button>
  </form>;
}
