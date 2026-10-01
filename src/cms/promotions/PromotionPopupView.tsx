"use client";

import { useEffect, useRef, useState } from "react";
import { resolveSafeTarget } from "@/cms/pages/model";
import type { PublicCampaign } from "./model";

const storagePrefix = "cb-promotion-dismissed:";
export function shouldShowPromotion(revisionId: string, frequency: PublicCampaign["frequency"],
  sessionValue: string | null, localValue: string | null, now: number): boolean {
  if (frequency === "every-visit") return true;
  const raw = frequency === "session" ? sessionValue : localValue;
  if (!raw) return true;
  try {
    const entry = JSON.parse(raw);
    return entry.revisionId !== revisionId || !Number.isFinite(entry.dismissedAt) ||
      (frequency === "24-hours" && now - entry.dismissedAt >= 86_400_000);
  } catch { return true; }
}

export function PromotionPopupView({ campaign, revisionId, preview = false }: {
  campaign: PublicCampaign; revisionId: string; preview?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const node = dialog.current;
    if (!node || (!campaign.enabled && !preview)) return;
    const key = storagePrefix + revisionId;
    let sessionValue: string | null = null;
    let localValue: string | null = null;
    try { sessionValue = sessionStorage.getItem(key); localValue = localStorage.getItem(key); } catch { /* optional storage */ }
    if (!preview && !shouldShowPromotion(revisionId, campaign.frequency, sessionValue, localValue, Date.now())) return;
    const timer = window.setTimeout(() => {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      node.showModal();
      node.querySelector<HTMLButtonElement>("[data-close-promotion]")?.focus({ preventScroll: true });
      setOpen(true);
    }, preview ? 0 : campaign.delaySeconds * 1000);
    return () => { window.clearTimeout(timer); if (node.open) node.close(); };
  }, [campaign.delaySeconds, campaign.enabled, campaign.frequency, preview, revisionId]);
  function dismiss() {
    const node = dialog.current;
    if (node?.open) node.close();
    setOpen(false);
    if (!preview && campaign.frequency !== "every-visit") {
      const key = storagePrefix + revisionId;
      const value = JSON.stringify({ revisionId, dismissedAt: Date.now() });
      try {
        (campaign.frequency === "session" ? sessionStorage : localStorage).setItem(key, value);
      } catch { /* optional storage */ }
    }
    previousFocus.current?.focus({ preventScroll: true });
  }
  const href = resolveSafeTarget(campaign.cta.target, preview);
  return <dialog ref={dialog} dir="rtl" aria-labelledby={`promotion-title-${revisionId}`}
    aria-describedby={`promotion-description-${revisionId}`}
    onCancel={event => { event.preventDefault(); dismiss(); }}
    className="fixed inset-0 m-auto max-h-[min(90dvh,850px)] w-[min(92vw,640px)] overflow-y-auto rounded-[2rem] border-0 bg-white p-0 text-navy shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm">
    <div className="relative grid gap-5 p-6 text-center sm:p-10">
      <button type="button" data-close-promotion aria-label="סגירת המבצע" onClick={dismiss}
        className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-2xl focus-visible:outline-2 focus-visible:outline-turquoise">×</button>
      <span className="mx-auto rounded-full bg-turquoise/15 px-4 py-1 text-sm font-black text-turquoise-dark">{campaign.badgeText}</span>
      <h2 id={`promotion-title-${revisionId}`} className="text-3xl font-black leading-tight sm:text-4xl">{campaign.h1}</h2>
      {campaign.showPrice && <div aria-label="מחיר המבצע" className="flex flex-wrap items-baseline justify-center gap-3">
        <strong className="text-4xl font-black text-turquoise-dark" dir="auto">{campaign.currentPrice} ₪</strong>
        {campaign.oldPrice && <s className="text-xl text-slate-500" dir="auto">{campaign.oldPrice} ₪</s>}
      </div>}
      {campaign.benefitText && <p className="rounded-2xl bg-cyan-50 px-4 py-3 font-bold">{campaign.benefitText}</p>}
      <p id={`promotion-description-${revisionId}`} className="text-lg leading-8">{campaign.description}</p>
      {href ? <a href={href} onClick={dismiss} className="btn-primary justify-self-stretch">{campaign.cta.label}</a> :
        <span aria-disabled="true" className="btn-primary justify-self-stretch">{campaign.cta.label}</span>}
      <p className="text-sm leading-6 text-slate-600">{campaign.terms}</p>
      {preview && <p className="text-xs font-bold">תצוגה מקדימה פרטית · פעולת קשר אינה זמינה</p>}
    </div>
    <span className="sr-only" aria-live="polite">{open ? "חלון המבצע פתוח" : ""}</span>
  </dialog>;
}
