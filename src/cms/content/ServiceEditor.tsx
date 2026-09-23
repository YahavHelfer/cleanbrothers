"use client";

import { managedServiceKeys, serviceRegistry, type ManagedServiceKey } from "@/content/service-registry";
import { imagePositions, type ServiceDraft } from "./service-model";
import Link from "next/link";
import Image from "next/image";
import { STATIC_MEDIA_VERSION, type MediaChoice } from "@/cms/media/model";
import { useActionState, useState } from "react";
import { contentAction } from "./actions";
import type { ServiceEditorSnapshot } from "./repository";
import { PILOT_IMAGES, PILOT_KEY, PILOT_RELATED_PATHS, pilotTextFields, type PilotTextField } from "./pilot-model";

const initialAction = { ok: false, message: "" };
const lists = { signs: "סימנים שכדאי לבדוק", process: "שלבי העבודה", benefits: "יתרונות השירות" } as const;
export const previewHref = (id: string, key: ManagedServiceKey = PILOT_KEY) => `/admin/preview/services/${key}?revision=${id}`;

export function ServiceEditor({ snapshot, mediaChoices, serviceKey = PILOT_KEY }: { serviceKey?: ManagedServiceKey; snapshot: ServiceEditorSnapshot; mediaChoices?: MediaChoice[] }) {
  const [draft, setDraft] = useState<ServiceDraft>(snapshot.draft);
  const [state, action, pending] = useActionState(contentAction, initialAction);
  const relatedPaths = draft.schemaVersion === 3 ? managedServiceKeys.map(key => `/${key}`) : [...PILOT_RELATED_PATHS];
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.draft);
  const update = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <form action={action} className="grid gap-7 rounded-3xl border theme-card p-5 sm:p-8" aria-label="עריכת השירות">
    <input type="hidden" name="serviceKey" value={serviceKey} />
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
          {relatedPaths.map((path) => <option key={path} value={path}>{serviceRegistry[path.slice(1) as ManagedServiceKey].crmName}</option>)}
        </select></label>
        <button type="button" className="justify-self-start rounded border px-4 py-2" onClick={() => update("relatedLinks", draft.relatedLinks.filter((_, i) => i !== index))}>הסרת קישור {index + 1}</button>
      </div>)}
      <button type="button" className="justify-self-start rounded border px-4 py-2" disabled={draft.relatedLinks.length >= relatedPaths.length}
        onClick={() => update("relatedLinks", [...draft.relatedLinks, { label: "", href: relatedPaths.find((path) => !draft.relatedLinks.some((link) => link.href === path))! }])}>הוספת קישור</button>
    </fieldset>
    {mediaChoices ? <fieldset disabled={pending} className="grid gap-4">
      <legend className="mb-3 font-black">תמונות מספריית המדיה</legend>
      <p>בחירת תמונה נשמרת בטיוטה חדשה בלבד. גרסה שפורסמה שומרת את התמונה המדויקת שנבחרה בה.</p>
      {(draft.schemaVersion===1?[STATIC_MEDIA_VERSION]:draft.images).map((selected,index)=>{
        const selectedIds=draft.schemaVersion===1?[STATIC_MEDIA_VERSION]:draft.images;
        const choice=mediaChoices.find(c=>c.versionId===selected);
        const change=(ids:string[])=>setDraft(current=>({...current,schemaVersion:current.schemaVersion === 3 ? 3 : 2,images:ids,...(current.imagePositions ? {imagePositions:Object.fromEntries(Object.entries(current.imagePositions).filter(([id])=>ids.includes(id)))} : {})}));
        return <div key={index} className="grid gap-3 rounded-xl border p-4">
          {choice&&<Image src={choice.src} alt={draft.imageAlt} width={200} height={150} unoptimized className="h-36 w-full object-contain"/>}
          <label className="grid gap-2">תמונת השירות {index+1}<select className="field" value={selected} onChange={e=>{
            const next=mediaChoices.find(c=>c.versionId===e.target.value)!;
            setDraft(current=>({...current,schemaVersion:current.schemaVersion === 3 ? 3 : 2,images:selectedIds.map((id,i)=>i===index?next.versionId:id),...(index===0?{imageAlt:next.altText}:{}),...(current.imagePositions ? {imagePositions:Object.fromEntries(Object.entries(current.imagePositions).map(([id,crop])=>[id===selected?next.versionId:id,crop]))} : {})}));
          }}>{mediaChoices.filter(c=>!c.archived||c.versionId===selected).map(c=><option key={c.versionId} value={c.versionId} disabled={selectedIds.includes(c.versionId)&&c.versionId!==selected}>{c.label} — גרסה {c.number}{c.archived?' (בארכיון)':''}</option>)}</select></label>
          <div className="flex gap-3"><button type="button" className="rounded border p-2" disabled={index===0} aria-label={`העלאת תמונה ${index+1}`} onClick={()=>{const ids=[...selectedIds];[ids[index-1],ids[index]]=[ids[index],ids[index-1]];change(ids);}}>↑</button>
          <button type="button" className="rounded border p-2" disabled={selectedIds.length===1} aria-label={`הסרת תמונה ${index+1}`} onClick={()=>change(selectedIds.filter((_,i)=>i!==index))}>הסרה</button></div>
        </div>;
      })}
      <button type="button" className="rounded border px-4 py-2 justify-self-start" disabled={draft.images.length>=8||!mediaChoices.some(c=>!c.archived&&!(draft.schemaVersion===1?[STATIC_MEDIA_VERSION]:draft.images).includes(c.versionId))} onClick={()=>{
        const ids=draft.schemaVersion===1?[STATIC_MEDIA_VERSION]:draft.images;
        const next=mediaChoices.find(c=>!c.archived&&!ids.includes(c.versionId));if(next)setDraft(current=>({...current,schemaVersion:current.schemaVersion === 3 ? 3 : 2,images:[...ids,next.versionId]}));
      }}>הוספת תמונה</button>
      <Link prefetch={false} href="/admin/media" className="underline">לספריית המדיה</Link>
    </fieldset> : draft.schemaVersion === 1 ? <><fieldset disabled={pending} className="grid gap-3">
      <legend className="mb-3 font-black">תמונות מאושרות</legend>
      <label className="grid gap-2">תמונת השירות<select className="field" value={draft.images[0]} onChange={(event) => update("images", [event.target.value])}>
        {PILOT_IMAGES.map((image) => <option key={image} value={image}>תמונת העבודה הקיימת — ריפוד עדין</option>)}
      </select></label>
      <p className="text-sm theme-muted">לשירות יש תמונה מאושרת אחת. תיאור התמונה ניתן לעריכה; העלאת תמונות חדשות אינה זמינה.</p>
    </fieldset></> : <p>בחירת תמונות זמינה דרך ספריית המדיה כאשר היא פעילה.</p>}
    {draft.schemaVersion === 3 && <fieldset disabled={pending} className="grid gap-4">
      <legend className="font-black">מיקום התמונות</legend>
      {draft.images.map((id, index) => <label key={id} className="grid gap-2">מיקום תמונה {index + 1}
        <select className="field" value={draft.imagePositions?.[id] || draft.imagePosition || "object-center"}
          onChange={event => update("imagePositions", { ...draft.imagePositions, [id]: event.target.value })}>
          {imagePositions.map((position, i) => <option key={position} value={position}>{["מרכז", "מרכז, מעט למעלה", "מעט ימינה", "מרכז ימינה", "מרכז עליון"][i]}</option>)}
        </select>
      </label>)}
    </fieldset>}
    {draft.beforeAfter && <fieldset disabled={pending} className="grid gap-4">
      <legend className="font-black">תמונות לפני ואחרי</legend>
      {(["title", "description", "beforeAlt", "afterAlt"] as const).map((key, index) => <label key={key} className="grid gap-2">
        {["כותרת לפני ואחרי", "תיאור לפני ואחרי", "תיאור חלופי לפני", "תיאור חלופי אחרי"][index]}
        <textarea className="field" required maxLength={key === "description" ? 2000 : key === "title" ? 180 : 300} value={draft.beforeAfter![key]}
          onChange={event => update("beforeAfter", { ...draft.beforeAfter!, [key]: event.target.value })} />
      </label>)}
      {mediaChoices && (["beforeImage", "afterImage"] as const).map((key,index) => <label key={key} className="grid gap-2">
        {index === 0 ? "תמונה לפני" : "תמונה אחרי"}
        <select className="field" value={draft.beforeAfter![key]} onChange={event => update("beforeAfter", { ...draft.beforeAfter!, [key]: event.target.value })}>
          {mediaChoices.filter(choice => !choice.archived || choice.versionId === draft.beforeAfter![key]).map(choice => <option key={choice.versionId} value={choice.versionId}>{choice.label} — גרסה {choice.number}</option>)}
        </select>
      </label>)}
    </fieldset>}
    <div className="grid gap-4 border-t pt-5">
      <p role="status">{dirty ? "יש שינויים בטופס שטרם נשמרו. תצוגה מקדימה מציגה רק את הגרסה השמורה." : "כל השינויים בטופס נשמרו בטיוטה."}</p>
      {state.message && <p role={state.ok ? "status" : "alert"} className="rounded border p-4">{state.message}</p>}
      <div className="flex flex-wrap gap-4">
        <button name="intent" value="save" disabled={pending} className="btn-primary">שמירת טיוטה</button>
        <Link href={previewHref(snapshot.draftRevisionId, serviceKey)} prefetch={false} className="btn-secondary">תצוגה מקדימה</Link>
      </div>
      <label className="flex items-center gap-3"><input type="checkbox" name="confirmPublish" value="yes" disabled={dirty || pending} />אני מאשר/ת לפרסם את הגרסה השמורה</label>
      <button name="intent" value="publish" disabled={dirty || pending || snapshot.draftRevisionId === snapshot.publishedRevisionId}
        className="btn-primary justify-self-start disabled:opacity-50">פרסום</button>
      <p className="text-sm theme-muted">פרסום מעדכן את הגרסה המוצגת בסביבת התוכן הנוכחית.</p>
    </div>
  </form>;
}

export function RestoreRevision({ generation, revision, source, serviceKey = PILOT_KEY }: { serviceKey?: ManagedServiceKey; generation: number; revision: string; source: string }) {
  const [state, action, pending] = useActionState(contentAction, initialAction);
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="serviceKey" value={serviceKey} /><input type="hidden" name="intent" value="restore" /><input type="hidden" name="source" value={source} />
    <input type="hidden" name="generation" value={generation} /><input type="hidden" name="revision" value={revision} />
    <button disabled={pending} className="rounded-xl border px-4 py-2 font-bold">שחזור כטיוטה חדשה</button>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </form>;
}
