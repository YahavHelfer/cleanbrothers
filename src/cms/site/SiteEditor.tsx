"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { managedServiceKeys, serviceRegistry, type ManagedServiceKey } from "@/content/service-registry";
import { siteAction } from "./actions";
import type { SiteEditorSnapshot } from "./repository";
import { type SiteDocumentKind, type SiteFooter, type SiteNavigation,
  type SitePayload, type SiteSettings, type SiteTarget } from "./model";

const initialAction = { ok: false, message: "" };
const subscribe = () => () => {};
const useReady = () => useSyncExternalStore(subscribe, () => true, () => false);
const field = "field w-full";
const button = "rounded-xl border px-3 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise disabled:opacity-50";
function Text({ label, value, onChange, max = 500, multi = false }: {
  label: string; value: string; onChange: (value: string) => void; max?: number; multi?: boolean;
}) { return <label className="grid gap-2 font-bold">{label}
  {multi ? <textarea className={`${field} min-h-24`} value={value} maxLength={max} required onChange={event => onChange(event.target.value)} />
    : <input className={field} value={value} maxLength={max} required onChange={event => onChange(event.target.value)} />}
</label>; }
function SettingsFields({ value, change }: { value: SiteSettings; change: (next: SiteSettings) => void }) {
  return <div className="grid gap-4">
    <Text label="שם העסק לתצוגה" value={value.businessName} max={120}
      onChange={businessName => change({ ...value, businessName })} />
    <Text label="טלפון לתצוגה (אותן ספרות של יעד החיוג המאושר)" value={value.phoneDisplay} max={30}
      onChange={phoneDisplay => change({ ...value, phoneDisplay })} />
    <p className="text-sm text-[var(--muted)]">קישור החיוג ומעקב השיחות אינם משתנים בשדה זה.</p>
    <Text label="אימייל ציבורי" value={value.email} max={254} onChange={email => change({ ...value, email })} />
    <Text label="אזורי שירות — שורה לכל אזור" value={value.serviceAreas.join("\n")} multi max={1600}
      onChange={text => change({ ...value, serviceAreas: text.split("\n").map(area => area.trim()).filter(Boolean) })} />
    <Text label="תיאור עסק לנתונים מובנים" value={value.structuredDescription} multi max={500}
      onChange={structuredDescription => change({ ...value, structuredDescription })} />
  </div>;
}
const staticOptions = ["/", "/services", "/gallery", "/about", "/contact"] as const;
function targetValue(target: SiteTarget) {
  return target.kind === "static" ? `static:${target.path}` :
    target.kind === "service" ? `service:${target.key}` : `page:${target.id}`;
}
function targetFromValue(value: string): SiteTarget {
  if (value.startsWith("static:")) return { kind: "static", path: value.slice(7) as typeof staticOptions[number] };
  if (value.startsWith("service:")) return { kind: "service", key: value.slice(8) as ManagedServiceKey };
  return { kind: "page", id: value.slice(5) };
}
function NavigationFields({ value, change, pageRoutes }: { value: SiteNavigation;
  change: (next: SiteNavigation) => void; pageRoutes: Record<string,string> }) {
  const replace = (index: number, next: SiteNavigation["items"][number]) =>
    change({ ...value, items: value.items.map((item,i) => i === index ? next : item) });
  const reorder = (index: number, offset: number) => {
    const items = [...value.items]; [items[index],items[index+offset]] = [items[index+offset],items[index]];
    change({ ...value, items: items.map((item,order) => ({ ...item,order })) });
  };
  return <div className="grid gap-4">
    {value.items.map((item,index) => <fieldset key={item.id} className="grid gap-3 rounded-2xl border p-4">
      <legend className="font-black">קישור {index+1}</legend>
      <Text label="תווית" value={item.label} max={80} onChange={label => replace(index,{...item,label})} />
      <label className="grid gap-2 font-bold">יעד מאושר
        <select className={field} value={targetValue(item.target)} onChange={event =>
          replace(index,{...item,target:targetFromValue(event.target.value)})}>
          {staticOptions.map(path => <option key={path} value={`static:${path}`}>{path}</option>)}
          {managedServiceKeys.map(key => <option key={key} value={`service:${key}`}>שירות: {serviceRegistry[key].crmName}</option>)}
          {Object.entries(pageRoutes).map(([id,slug]) => <option key={id} value={`page:${id}`}>עמוד CMS: /{slug}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={item.visible}
        onChange={event => replace(index,{...item,visible:event.target.checked})} />מוצג בניווט</label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={index===0} aria-label={`הזז למעלה: ${item.label}`}
          onClick={() => reorder(index,-1)}>למעלה</button>
        <button type="button" className={button} disabled={index===value.items.length-1} aria-label={`הזז למטה: ${item.label}`}
          onClick={() => reorder(index,1)}>למטה</button>
        <button type="button" className={button} disabled={value.items.length<=1}
          onClick={() => change({...value,items:value.items.filter((_,i)=>i!==index).map((row,order)=>({...row,order}))})}>הסרה מהטיוטה</button>
      </div>
    </fieldset>)}
    <button type="button" className={button} disabled={value.items.length>=20} onClick={() => change({...value,
      items:[...value.items,{id:crypto.randomUUID(),order:value.items.length,label:"קישור חדש",visible:false,
        target:{kind:"static",path:"/about"}}]})}>הוספת קישור</button>
  </div>;
}
function FooterFields({ value, change }: { value: SiteFooter; change: (next: SiteFooter) => void }) {
  const replaceLegal = (index: number, next: SiteFooter["legal"][number]) =>
    change({...value,legal:value.legal.map((item,i)=>i===index?next:item)});
  const reorderLegal = (index: number, offset: number) => {
    const legal=[...value.legal]; [legal[index],legal[index+offset]]=[legal[index+offset],legal[index]];
    change({...value,legal:legal.map((item,order)=>({...item,order}))});
  };
  return <div className="grid gap-5">
    <Text label="תיאור ב־Footer" value={value.description} multi max={500}
      onChange={description => change({...value,description})} />
    <fieldset className="grid gap-3 rounded-2xl border p-4"><legend className="font-black">שירותים נבחרים</legend>
      {value.featuredServices.map((key,index)=><div key={`${key}-${index}`} className="flex flex-wrap items-center gap-2">
        <select className={field} aria-label={`שירות ${index+1}`} value={key} onChange={event=>change({...value,
          featuredServices:value.featuredServices.map((item,i)=>i===index?event.target.value as ManagedServiceKey:item)})}>
          {managedServiceKeys.map(candidate=><option key={candidate} value={candidate}>{serviceRegistry[candidate].crmName}</option>)}
        </select>
        <button type="button" className={button} disabled={value.featuredServices.length<=1}
          onClick={()=>change({...value,featuredServices:value.featuredServices.filter((_,i)=>i!==index)})}>הסרה</button>
      </div>)}
      <button type="button" className={button} disabled={value.featuredServices.length>=8}
        onClick={()=>change({...value,featuredServices:[...value.featuredServices,
          managedServiceKeys.find(key=>!value.featuredServices.includes(key))||managedServiceKeys[0]]})}>הוספת שירות</button>
    </fieldset>
    <fieldset className="grid gap-3 rounded-2xl border p-4"><legend className="font-black">קישורים משפטיים</legend>
      {value.legal.map((item,index)=><div key={item.path} className="grid gap-2 rounded-xl border p-3">
        <p><bdi>{item.path}</bdi></p>
        <Text label="תווית" value={item.label} max={80} onChange={label=>replaceLegal(index,{...item,label})} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={item.visible}
          onChange={event=>replaceLegal(index,{...item,visible:event.target.checked})} />מוצג</label>
        <div className="flex gap-2"><button type="button" className={button} disabled={index===0}
          onClick={()=>reorderLegal(index,-1)}>למעלה</button><button type="button" className={button}
          disabled={index===value.legal.length-1} onClick={()=>reorderLegal(index,1)}>למטה</button></div>
      </div>)}
    </fieldset>
    <Text label="זכויות יוצרים" value={value.copyright} max={120} onChange={copyright=>change({...value,copyright})} />
    <Text label="שורת סיום" value={value.tagline} max={120} onChange={tagline=>change({...value,tagline})} />
    <Text label="טקסט כפתור WhatsApp" value={value.whatsappCtaLabel} max={120}
      onChange={whatsappCtaLabel=>change({...value,whatsappCtaLabel})} />
    <p className="text-sm text-[var(--muted)]">יעד WhatsApp וייחוס הפניות נשארים בשליטת האתר.</p>
  </div>;
}

export function SiteEditor({ kind, snapshot, pageRoutes }: { kind: SiteDocumentKind;
  snapshot: SiteEditorSnapshot; pageRoutes: Record<string,string> }) {
  const ready = useReady();
  const [draft,setDraft] = useState<SitePayload>(snapshot.draft);
  const [confirmed,setConfirmed] = useState(false);
  const [state,formAction,pending] = useActionState(siteAction,initialAction);
  const dirty = JSON.stringify(draft)!==JSON.stringify(snapshot.draft);
  return <div className="grid gap-6">
    <form action={formAction} className="grid gap-6 rounded-3xl border theme-card p-6">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="generation" value={snapshot.generation} />
      <input type="hidden" name="revision" value={snapshot.draftRevisionId} />
      <input type="hidden" name="payload" value={JSON.stringify(draft)} />
      {kind==="settings" && <SettingsFields value={draft as SiteSettings} change={setDraft} />}
      {kind==="navigation" && <NavigationFields value={draft as SiteNavigation} change={setDraft} pageRoutes={pageRoutes} />}
      {kind==="footer" && <FooterFields value={draft as SiteFooter} change={setDraft} />}
      <div className="flex flex-wrap gap-3"><button className="btn-primary" name="intent" value="save"
        disabled={!ready||pending||!dirty}>שמירת טיוטה</button>
        <Link href={`/admin/preview/site/${kind}?revision=${snapshot.draftRevisionId}`} prefetch={false}
          className="btn-secondary">תצוגה מקדימה מדויקת</Link></div>
      <label className="flex items-center gap-2"><input type="checkbox" name="confirmPublish" value="yes"
        checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} />אני מאשר/ת לפרסם את הגרסה השמורה</label>
      <button className="btn-primary" name="intent" value="publish" disabled={!ready||pending||dirty||!confirmed||
        snapshot.draftRevisionId===snapshot.publishedRevisionId}>פרסום</button>
      {state.message && <p role="status">{state.message}</p>}
      {dirty && <p>השינויים בטופס עדיין לא נשמרו. תצוגה מקדימה מציגה את הגרסה השמורה.</p>}
    </form>
    <section className="grid gap-3" aria-label="היסטוריית גרסאות"><h2 className="text-2xl font-black">היסטוריית גרסאות</h2>
      {snapshot.history.map(revision=><article key={revision.id} className="grid gap-2 rounded-2xl border theme-card p-4">
        <h3 className="font-black">גרסה {revision.number}</h3>
        <p>{revision.id===snapshot.publishedRevisionId?"מפורסמת":revision.id===snapshot.draftRevisionId?"טיוטה":"היסטורית"}</p>
        <Link href={`/admin/preview/site/${kind}?revision=${revision.id}`} prefetch={false}>תצוגה מדויקת</Link>
        <RestoreSiteRevision kind={kind} snapshot={snapshot} source={revision.id} />
      </article>)}
    </section>
  </div>;
}
function RestoreSiteRevision({ kind,snapshot,source }: {kind:SiteDocumentKind;snapshot:SiteEditorSnapshot;source:string}) {
  const ready=useReady(); const [state,action,pending]=useActionState(siteAction,initialAction);
  return <form action={action} className="grid gap-2"><input type="hidden" name="kind" value={kind} />
    <input type="hidden" name="generation" value={snapshot.generation} />
    <input type="hidden" name="revision" value={snapshot.draftRevisionId} />
    <input type="hidden" name="source" value={source} />
    <button className={button} name="intent" value="restore" disabled={!ready||pending}>שחזור כטיוטה חדשה</button>
    {state.message && <p role="status">{state.message}</p>}</form>;
}
