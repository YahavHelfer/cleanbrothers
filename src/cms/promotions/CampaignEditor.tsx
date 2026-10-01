"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { internalRoutes, type SafeTarget } from "@/cms/pages/model";
import { campaignAction } from "./actions";
import { placementKeys, type CampaignDraft, type CampaignSnapshot } from "./model";

const subscribe = () => () => {};
const field = "field w-full";
const button = "rounded-xl border px-4 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise";
const placementLabels: Record<string, string> = { "global:site": "כל האתר", "home:home": "דף הבית",
  "page:about": "אודות", "page:services": "רשימת שירותים" };
export function CampaignEditor({ snapshot }: { snapshot: CampaignSnapshot }) {
  const [draft, setDraft] = useState<CampaignDraft>(snapshot.draft);
  const [state, action, pending] = useActionState(campaignAction, { ok: false, message: "" });
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.draft);
  function change<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }
  const target = draft.cta.target;
  function changeTarget(next: SafeTarget) { change("cta", { ...draft.cta, target: next }); }
  return <form action={action} className="grid gap-5 rounded-3xl border theme-card p-5" dir="rtl">
    <input type="hidden" name="id" value={snapshot.documentId} />
    <input type="hidden" name="generation" value={snapshot.generation} />
    <input type="hidden" name="revision" value={snapshot.draftRevisionId} />
    <input type="hidden" name="payload" value={JSON.stringify(draft)} />
    <fieldset disabled={!ready || pending} className="grid gap-4"><legend className="text-xl font-black">פרטי המבצע</legend>
      {([["publicTitle", "שם פנימי", 120], ["badgeText", "תגית מבצע", 80], ["h1", "כותרת", 180],
        ["description", "תיאור", 2000], ["seoTitle", "כותרת SEO", 120],
        ["seoDescription", "תיאור SEO", 320], ["terms", "תנאים", 700]] as const).map(([key, label, max]) =>
        <label key={key} className="grid gap-1 font-bold">{label}
          {key === "description" || key === "terms" ?
            <textarea className={field} value={draft[key]} maxLength={max} required
              onChange={event => change(key, event.target.value)} /> :
            <input className={field} value={draft[key]} maxLength={max} required
              onChange={event => change(key, event.target.value)} />}</label>)}
      <label>תצוגה <select className={field} value={draft.displayMode}
        onChange={event => change("displayMode", event.target.value as CampaignDraft["displayMode"])}>
        <option value="popup">פופאפ מרכזי</option><option value="inline">באנר בעמוד</option></select></label>
      <label><input type="checkbox" checked={draft.enabled} onChange={event => change("enabled", event.target.checked)} /> תוכן המבצע מאופשר</label>
      <label><input type="checkbox" checked={draft.showPrice} onChange={event => setDraft(current => ({ ...current,
        showPrice: event.target.checked, currentPrice: event.target.checked ? (current.currentPrice ?? "מחיר מבצע") : null,
        oldPrice: event.target.checked ? current.oldPrice : null }))} /> הצגת מחיר</label>
      {draft.showPrice && <div className="grid gap-3 sm:grid-cols-2">
        <label>מחיר מבצע<input className={field} value={draft.currentPrice ?? ""} maxLength={40} required
          onChange={event => change("currentPrice", event.target.value)} /></label>
        <label>מחיר קודם (אופציונלי)<input className={field} value={draft.oldPrice ?? ""} maxLength={40}
          onChange={event => change("oldPrice", event.target.value || null)} /></label></div>}
      <label>יתרון נוסף (אופציונלי)<input className={field} value={draft.benefitText ?? ""} maxLength={240}
        onChange={event => change("benefitText", event.target.value || null)} /></label>
      <label>טקסט כפתור<input className={field} value={draft.cta.label} maxLength={120} required
        onChange={event => change("cta", { ...draft.cta, label: event.target.value })} /></label>
      <label>יעד כפתור<select className={field} value={target.kind}
        onChange={event => changeTarget(event.target.value === "phone" ? { kind: "phone" } :
          event.target.value === "whatsapp" ? { kind: "whatsapp", message: "אשמח לפרטים על המבצע" } :
            { kind: "internal", path: "/contact" })}>
        <option value="internal">עמוד באתר</option><option value="phone">חיוג</option><option value="whatsapp">WhatsApp בטוח</option></select></label>
      {target.kind === "internal" && <label>עמוד יעד<select className={field} value={target.path}
        onChange={event => changeTarget({ kind: "internal", path: event.target.value as typeof target.path })}>
        {internalRoutes.map(path => <option key={path} value={path}>{path}</option>)}</select></label>}
      {target.kind === "whatsapp" && <label>הודעת פתיחה<input className={field} maxLength={300} value={target.message}
        onChange={event => changeTarget({ kind: "whatsapp", message: event.target.value })} /></label>}
      <label>עיכוב בשניות (0–15)<input className={field} type="number" min={0} max={15} step={1}
        value={draft.delaySeconds} onChange={event => change("delaySeconds", Number(event.target.value))} /></label>
      <label>תדירות<select className={field} value={draft.frequency}
        onChange={event => change("frequency", event.target.value as CampaignDraft["frequency"])}>
        <option value="session">פעם בסשן</option><option value="24-hours">פעם ב־24 שעות</option>
        <option value="every-visit">בכל כניסה</option></select></label>
      <fieldset className="grid gap-2"><legend className="font-bold">היכן להציג?</legend>
        {placementKeys.map(key => <label key={key}><input type="checkbox" checked={draft.placements.includes(key)}
          onChange={event => change("placements", event.target.checked ? [...draft.placements, key] :
            draft.placements.filter(item => item !== key))} /> {placementLabels[key] ?? `שירות: ${key.slice(8)}`}</label>)}</fieldset>
    </fieldset>
    <p role="status">{dirty ? "יש שינויים שלא נשמרו." : "הטיוטה שמורה."}</p>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
    <div className="flex flex-wrap gap-3">
      <button className={button} name="intent" value="save" disabled={!ready || pending || !dirty}>שמירת טיוטה</button>
      <Link href={`/admin/preview/promotions/${snapshot.documentId}?revision=${snapshot.draftRevisionId}`} prefetch={false}
        className={button}>תצוגה מקדימה של פופאפ</Link>
      <Link href="/admin/promotions/schedules" prefetch={false} className={button}>תזמון מתקדם</Link>
    </div>
    <label><input type="checkbox" name="confirm" value="yes" disabled={!ready || pending || dirty} /> אישור פרסום/ביטול</label>
    <div className="flex flex-wrap gap-3">
      <button className={button} name="intent" value="activate" disabled={!ready || pending || dirty}>פרסום והפעלה</button>
      <button className={button} name="intent" value="disable" disabled={!ready || pending || !snapshot.active}>כיבוי המבצע</button>
    </div>
  </form>;
}
