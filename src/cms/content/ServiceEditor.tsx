"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { contentAction } from "./actions";
import type { PilotEditorSnapshot } from "./repository";
import { PILOT_IMAGES, PILOT_KEY, PILOT_RELATED_PATHS, pilotTextFields, type PilotDraft, type PilotTextField } from "./pilot-model";

const initialAction = { ok: false, message: "" };
const lists = { signs: "סימנים שכדאי לבדוק", process: "שלבי העבודה", benefits: "יתרונות השירות" } as const;
export const previewHref = (id: string) => `/admin/preview/services/${PILOT_KEY}?revision=${id}`;

export function ServiceEditor({ snapshot }: { snapshot: PilotEditorSnapshot }) {
  const [draft, setDraft] = useState<PilotDraft>(snapshot.draft);
  const [state, action, pending] = useActionState(contentAction, initialAction);
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.draft);
  const update = <K extends keyof PilotDraft>(key: K, value: PilotDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <form action={action} className="grid gap-7 rounded-3xl border theme-card p-5 sm:p-8" aria-label="עריכת השירות">
    <input type="hidden" name="generation" value={snapshot.generation} />
    <input type="hidden" name="revision" value={snapshot.draftRevisionId} />
    <input type="hidden" name="payload" value={JSON.stringify(draft)} />
    <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
      <legend className="mb-5 text-xl font-black">תוכן השירות</legend>
      {(Object.keys(pilotTextFields) as PilotTextField[]).map((key) => <label key={key} className="grid gap-2 font-bold">
        {pilotTextFields[key].label}
        <textarea className="field min-h-24" value={draft[key]} maxLength={pilotTextFields[key].max} required
          onChange={(event) => update(key, event.target.value)} />
        <span className="text-xs theme-muted">עד {pilotTextFields[key].max} תווים</span>
      </label>)}
    </fieldset>
    {(Object.keys(lists) as (keyof typeof lists)[]).map((key) => <fieldset key={key} disabled={pending} className="grid gap-3">
      <legend className="mb-3 font-black">{lists[key]}</legend>
      {draft[key].map((text, index) => <div key={index} className="flex items-start gap-2">
        <textarea className="field min-h-16" aria-label={`${lists[key]} ${index + 1}`} required maxLength={300} value={text}
          onChange={(event) => update(key, draft[key].map((value, i) => i === index ? event.target.value : value))} />
        <button type="button" className="rounded border p-3" disabled={draft[key].length === 1} aria-label={`הסרת ${lists[key]} ${index + 1}`}
          onClick={() => update(key, draft[key].filter((_, i) => i !== index))}>הסרה</button>
        <button type="button" className="rounded border p-3" disabled={index === 0} aria-label={`העלאת ${lists[key]} ${index + 1}`}
          onClick={() => { const items = [...draft[key]]; [items[index - 1], items[index]] = [items[index], items[index - 1]]; update(key, items); }}>↑</button>
      </div>)}
      <button type="button" className="justify-self-start rounded border px-4 py-2" disabled={draft[key].length >= 12}
        onClick={() => update(key, [...draft[key], ""])}>הוספת פריט — {lists[key]}</button>
    </fieldset>)}
    <fieldset disabled={pending} className="grid gap-4">
      <legend className="mb-3 font-black">שאלות ותשובות</legend>
      {draft.faqs.map((faq, index) => <div key={index} className="grid gap-3 rounded-2xl border p-4">
        <label className="grid gap-2">שאלה {index + 1}<input className="field" required maxLength={300} value={faq.question}
          onChange={(event) => update("faqs", draft.faqs.map((value, i) => i === index ? { ...value, question: event.target.value } : value))} /></label>
        <label className="grid gap-2">תשובה {index + 1}<textarea className="field min-h-24" required maxLength={2000} value={faq.answer}
          onChange={(event) => update("faqs", draft.faqs.map((value, i) => i === index ? { ...value, answer: event.target.value } : value))} /></label>
        <button type="button" disabled={draft.faqs.length === 1} className="justify-self-start rounded border px-4 py-2"
          onClick={() => update("faqs", draft.faqs.filter((_, i) => i !== index))}>הסרת שאלה {index + 1}</button>
      </div>)}
      <button type="button" disabled={draft.faqs.length >= 20} className="justify-self-start rounded border px-4 py-2"
        onClick={() => update("faqs", [...draft.faqs, { question: "", answer: "" }])}>הוספת שאלה</button>
    </fieldset>
    <fieldset disabled={pending} className="grid gap-4">
      <legend className="mb-3 font-black">קישורים קשורים</legend>
      {draft.relatedLinks.map((link, index) => <div key={index} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2">
        <label className="grid gap-2">תווית קישור {index + 1}<input className="field" required maxLength={120} value={link.label}
          onChange={(event) => update("relatedLinks", draft.relatedLinks.map((v, i) => i === index ? { ...v, label: event.target.value } : v))} /></label>
        <label className="grid gap-2">יעד קישור {index + 1}<select className="field" value={link.href}
          onChange={(event) => update("relatedLinks", draft.relatedLinks.map((v, i) => i === index ? { ...v, href: event.target.value } : v))}>
          {PILOT_RELATED_PATHS.map((path) => <option key={path} value={path}>{path === "/mattress-cleaning" ? "ניקוי מזרנים" : "ניקוי ריפודי רכב"}</option>)}
        </select></label>
        <button type="button" className="justify-self-start rounded border px-4 py-2" onClick={() => update("relatedLinks", draft.relatedLinks.filter((_, i) => i !== index))}>הסרת קישור {index + 1}</button>
      </div>)}
      <button type="button" className="justify-self-start rounded border px-4 py-2" disabled={draft.relatedLinks.length >= PILOT_RELATED_PATHS.length}
        onClick={() => update("relatedLinks", [...draft.relatedLinks, { label: "", href: PILOT_RELATED_PATHS.find((path) => !draft.relatedLinks.some((link) => link.href === path))! }])}>הוספת קישור</button>
    </fieldset>
    <fieldset disabled={pending} className="grid gap-3">
      <legend className="mb-3 font-black">תמונות מאושרות</legend>
      <label className="grid gap-2">תמונת השירות<select className="field" value={draft.images[0]} onChange={(event) => update("images", [event.target.value])}>
        {PILOT_IMAGES.map((image) => <option key={image} value={image}>תמונת העבודה הקיימת — ריפוד עדין</option>)}
      </select></label>
      <p className="text-sm theme-muted">לשירות יש תמונה מאושרת אחת. תיאור התמונה ניתן לעריכה; העלאת תמונות חדשות אינה זמינה.</p>
    </fieldset>
    <div className="grid gap-4 border-t pt-5">
      <p role="status">{dirty ? "יש שינויים בטופס שטרם נשמרו. תצוגה מקדימה מציגה רק את הגרסה השמורה." : "כל השינויים בטופס נשמרו בטיוטה."}</p>
      {state.message && <p role={state.ok ? "status" : "alert"} className="rounded border p-4">{state.message}</p>}
      <div className="flex flex-wrap gap-4">
        <button name="intent" value="save" disabled={pending} className="btn-primary">שמירת טיוטה</button>
        <Link href={previewHref(snapshot.draftRevisionId)} prefetch={false} className="btn-secondary">תצוגה מקדימה</Link>
      </div>
      <label className="flex items-center gap-3"><input type="checkbox" name="confirmPublish" value="yes" disabled={dirty || pending} />אני מאשר/ת לפרסם את הגרסה השמורה</label>
      <button name="intent" value="publish" disabled={dirty || pending || snapshot.draftRevisionId === snapshot.publishedRevisionId}
        className="btn-primary justify-self-start disabled:opacity-50">פרסום</button>
      <p className="text-sm theme-muted">הפרסום הוא לסביבה המקומית בלבד. האתר החי נשאר ללא שינוי.</p>
    </div>
  </form>;
}

export function RestoreRevision({ generation, revision, source }: { generation: number; revision: string; source: string }) {
  const [state, action, pending] = useActionState(contentAction, initialAction);
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="intent" value="restore" /><input type="hidden" name="source" value={source} />
    <input type="hidden" name="generation" value={generation} /><input type="hidden" name="revision" value={revision} />
    <button disabled={pending} className="rounded-xl border px-4 py-2 font-bold">שחזור כטיוטה חדשה</button>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </form>;
}
