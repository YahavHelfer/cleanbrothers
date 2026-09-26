"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import type { MediaChoice } from "@/cms/media/model";
import { BlockFields } from "@/cms/pages/PageEditor";
import { blockDefinitions, defaultBlock, homeBlockDefinitions, type PageBlock } from "@/cms/pages/model";
import { serviceRegistry, type ManagedServiceKey } from "@/content/service-registry";
import { services } from "@/data/site";
import { homeAction } from "./actions";
import type { HomeSnapshot } from "./repository";
import { validateHomeDraft, type HomeBlock, type HomeBlockType, type HomeDraft } from "./model";

const initialAction = { ok: false, message: "" };
const subscribe = () => () => {};
function useReady() { return useSyncExternalStore(subscribe, () => true, () => false); }
const button = "rounded-xl border px-3 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise";
const field = "field w-full";
const labels: Record<string,string> = {
  eyebrow: "כותרת קטנה", title: "כותרת", description: "תיאור", mobileDescription: "תיאור לנייד",
  primaryLabel: "טקסט כפתור ראשי", secondaryLabel: "טקסט כפתור משני", backgroundAlt: "תיאור חלופי לרקע",
  items: "פריטים", trustChips: "תגיות אמון", note: "הערת שירותים", cards: "מלל כרטיסי הבית",
  benefit: "יתרון", steps: "שלבי התהליך", icon: "סמל מאושר", category: "קטגוריה",
  beforeVersionId: "גרסת תמונת לפני", afterVersionId: "גרסת תמונת אחרי", beforeAlt: "תיאור תמונת לפני",
  afterAlt: "תיאור תמונת אחרי", ctaLabel: "טקסט פעולה", factorsHeading: "כותרת גורמי המחיר",
  factors: "גורמי מחיר", ctaNote: "הערת פעולה", question: "שאלה", answer: "תשובה",
  whatsappLabel: "תווית WhatsApp", phoneLabel: "תווית חיוג", trustNotes: "הערות אמון",
};
const serviceCatalog = Object.fromEntries(services.map(service => [service.landingPath.slice(1),
  { title: service.title, benefit: service.benefit, description: service.description }]));
function label(key: string) { return labels[key] || serviceRegistry[key as ManagedServiceKey]?.crmName || key; }
type AnyValue = string | AnyValue[] | { [key: string]: AnyValue };

function ValueFields({ name, value, onChange, choices, section }: { name: string; value: AnyValue;
  onChange: (value: AnyValue) => void; choices: MediaChoice[]; section: HomeBlockType }) {
  if (typeof value === "string") {
    let options: { value: string; label: string }[] | null = null;
    if (name === "beforeVersionId" || name === "afterVersionId") options = choices.filter(choice =>
      !choice.archived || choice.versionId === value).map(choice => ({ value: choice.versionId, label: `${choice.label} — גרסה ${choice.number}` }));
    else if (name === "icon") options = (section === "homePricing" ? ["single","multi","car","air"] :
      ["image","quote","calendar","cleaning"]).map(v => ({ value: v, label: v }));
    else if (name === "category") options = ["sofas","mattresses","carpets","cars"].map(v => ({ value: v, label: v }));
    return <label className="grid gap-2 font-bold">{label(name)}
      {options ? <select className={field} value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select> : ["description","answer","mobileDescription"].includes(name) ?
        <textarea className={`${field} min-h-24`} value={value} maxLength={2000} required
          onChange={event => onChange(event.target.value)} /> :
        <input className={field} value={value} maxLength={320} required onChange={event => onChange(event.target.value)} />}
    </label>;
  }
  if (Array.isArray(value)) {
    if (name === "serviceKeys") return <fieldset className="grid gap-3 rounded-xl border p-3"><legend className="font-black">שירותים לפי סדר הופעה</legend>
      {(value as string[]).map((key, index) => <div className="flex flex-wrap gap-2" key={`${key}-${index}`}>
        <select className={field} value={key} aria-label={`שירות ${index+1}`} onChange={event =>
          onChange(value.map((current,i) => i === index ? event.target.value : current))}>
          {Object.entries(serviceRegistry).map(([id,service]) => <option key={id} value={id}>{service.crmName}</option>)}
        </select><button className={button} type="button" disabled={index===0} onClick={() => {
          const next=[...value]; [next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);
        }}>למעלה</button><button className={button} type="button" disabled={index===value.length-1} onClick={() => {
          const next=[...value];[next[index],next[index+1]]=[next[index+1],next[index]];onChange(next);
        }}>למטה</button><button className={button} type="button" disabled={value.length<=1}
          onClick={() => onChange(value.filter((_,i)=>i!==index))}>הסרה</button></div>)}
      {value.length<8 && <button className={button} type="button" onClick={()=>{
        const next=Object.keys(serviceRegistry).find(key=>!value.includes(key));
        if(next)onChange([...value,next]);
      }}>הוספת שירות קיים</button>}
    </fieldset>;
    return <fieldset className="grid gap-3 rounded-xl border p-3"><legend className="font-black">{label(name)}</legend>
      {value.map((item,index) => <div key={index} className="grid gap-2 rounded-xl border p-3">
        <ValueFields name={typeof item === "string" ? `${label(name)} ${index+1}` : name} value={item}
          onChange={next => onChange(value.map((entry,i)=>i===index?next:entry))} choices={choices} section={section} />
        <div className="flex flex-wrap gap-2"><button className={button} type="button" disabled={index===0} onClick={() => {
          const next=[...value];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);
        }}>למעלה</button><button className={button} type="button" disabled={index===value.length-1} onClick={() => {
          const next=[...value];[next[index],next[index+1]]=[next[index+1],next[index]];onChange(next);
        }}>למטה</button><button className={button} type="button" disabled={value.length<=1}
          onClick={() => onChange(value.filter((_,i)=>i!==index))}>הסרה</button></div>
      </div>)}
      {name === "items" && section === "homeFaq" && value.length < 20 && <button className={button} type="button"
        onClick={() => onChange([...value,{ question: "שאלה חדשה", answer: "תשובה חדשה" }])}>הוספת שאלה</button>}
    </fieldset>;
  }
  return <fieldset className="grid gap-3 rounded-xl border p-3"><legend className="font-black">{label(name)}</legend>
    {Object.entries(value).map(([key,item]) => <ValueFields key={key} name={key} value={item}
      onChange={next => onChange({ ...value, [key]: next })} choices={choices} section={section} />)}
  </fieldset>;
}

export function HomeEditor({ snapshot, templates, mediaChoices, promotionRevisions }: {
  snapshot: HomeSnapshot; templates: HomeBlock[]; mediaChoices: MediaChoice[];
  promotionRevisions: { id: string; number: number }[];
}) {
  const [draft,setDraft] = useState<HomeDraft>(() => validateHomeDraft(snapshot.draft));
  const [selectedType,setSelectedType] = useState<HomeBlock["type"]>("richText");
  const [state,action,actionPending] = useActionState(homeAction,initialAction);
  const ready=useReady(),pending=actionPending||!ready;
  const dirty=JSON.stringify(draft)!==JSON.stringify(snapshot.draft);
  const blocks=draft.blocks;
  const reorder=(next: HomeBlock[]) => setDraft(current=>({ ...current,
    blocks:next.map((block,position)=>({ ...block,position })) }));
  const update=(index:number,next:HomeBlock)=>reorder(blocks.map((block,i)=>i===index?next:block));
  const updateMeta=(key:"h1"|"seoTitle"|"seoDescription",value:string)=>setDraft(current=>key==="h1"?
    { ...current,h1:value,blocks:current.blocks.map(block=>block.type==="homeHero"?
      { ...block,payload:{...block.payload,title:value} }:block) }:{ ...current,[key]:value });
  const available=[...Object.keys(homeBlockDefinitions).filter(type=>!blocks.some(block=>block.type===type)),
    "richText","imageText","promotionBanner","spacer"] as HomeBlock["type"][];
  function addBlock() {
    if (blocks.length>=50) return;
    const type=available.includes(selectedType)?selectedType:available[0];
    if(!type)return;
    const template=templates.find(block=>block.type===type);
    const block=template ? { ...structuredClone(template),id:crypto.randomUUID(),hidden:false } :
      defaultBlock(type as "richText"|"imageText"|"promotionBanner"|"spacer",blocks.length,
        promotionRevisions[0]?.id) as HomeBlock;
    reorder([...blocks,block]);
  }
  return <form action={action} aria-label="עריכת דף הבית" className="grid gap-7 rounded-3xl border theme-card p-5 sm:p-8" dir="rtl">
    <input type="hidden" name="generation" value={snapshot.generation} />
    <input type="hidden" name="revision" value={snapshot.draftRevisionId} />
    <input type="hidden" name="payload" value={JSON.stringify(draft)} />
    <fieldset disabled={pending} className="grid gap-4"><legend className="text-xl font-black">דף הבית ו־SEO</legend>
      <p>זהות: דף הבית · כתובת ו־canonical קבועים: <bdi>/</bdi></p>
      {(["h1","seoTitle","seoDescription"] as const).map(key => <label key={key} className="grid gap-2 font-bold">
        {{h1:"כותרת ראשית",seoTitle:"כותרת SEO",seoDescription:"תיאור SEO"}[key]}
        {key==="seoDescription"?<textarea className={field} value={draft[key]} maxLength={320} required
          onChange={event=>updateMeta(key,event.target.value)}/>:
          <input className={field} value={draft[key]} maxLength={key==="h1"?180:120} required
            onChange={event=>updateMeta(key,event.target.value)}/>}
      </label>)}
    </fieldset>
    <fieldset disabled={pending} className="grid gap-4"><legend className="text-xl font-black">מקטעים לפי סדר הופעה</legend>
      {blocks.map((block,index)=><section key={block.id} data-block-id={block.id} className="grid gap-4 rounded-2xl border theme-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black">{index+1}. {homeBlockDefinitions[block.type as HomeBlockType]?.label||blockDefinitions[block.type as keyof typeof blockDefinitions]?.label}</h3>
          <p>{block.hidden?"מוסתר בגרסה זו":"מוצג בגרסה זו"}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className={button} type="button" disabled={index<=1} onClick={()=>{const next=[...blocks];[next[index-1],next[index]]=[next[index],next[index-1]];reorder(next);}}>הזז למעלה</button>
          <button className={button} type="button" disabled={index===0||index===blocks.length-1} onClick={()=>{const next=[...blocks];[next[index],next[index+1]]=[next[index+1],next[index]];reorder(next);}}>הזז למטה</button>
          <button className={button} type="button" disabled={block.type.startsWith("home")||blocks.length>=50}
            onClick={()=>reorder([...blocks.slice(0,index+1),{...structuredClone(block),id:crypto.randomUUID()},...blocks.slice(index+1)])}>שכפול</button>
          <button className={button} type="button" disabled={index===0} onClick={()=>update(index,{...block,hidden:!block.hidden})}>{block.hidden?"הצג":"הסתר"}</button>
          <button className={button} type="button" disabled={index===0} onClick={()=>reorder(blocks.filter((_,i)=>i!==index))}>הסרה מהטיוטה</button>
        </div>
        {block.type.startsWith("home") ? <>
          {block.type==="homeHero" && <label className="grid gap-2 font-bold">גרסת מדיה לפתיח
            <select className={field} value={block.mediaVersionId||""} onChange={event=>update(index,{...block,mediaVersionId:event.target.value||null})}>
              {mediaChoices.filter(choice=>!choice.archived||choice.versionId===block.mediaVersionId).map(choice=><option key={choice.versionId} value={choice.versionId}>{choice.label} — גרסה {choice.number}</option>)}
            </select></label>}
          <ValueFields name="payload" value={block.payload as AnyValue} choices={mediaChoices} section={block.type as HomeBlockType}
            onChange={value=>{
              const payload=value as Record<string,unknown>;
              if(block.type==="homeServices"&&Array.isArray(payload.serviceKeys)){
                const cards={...(payload.cards as Record<string,unknown>)};
                for(const key of payload.serviceKeys as string[]) if(!cards[key]&&serviceCatalog[key]) cards[key]=serviceCatalog[key];
                payload.cards=cards;
              }
              update(index,{...block,payload});
              if(block.type==="homeHero"&&typeof (value as Record<string,unknown>).title==="string")
                setDraft(current=>({...current,h1:(value as Record<string,string>).title}));
            }}/>
        </> : <BlockFields block={block as PageBlock} onChange={next=>update(index,next as HomeBlock)}
          choices={mediaChoices} promotionRevisions={promotionRevisions}/>}
      </section>)}
    </fieldset>
    <fieldset disabled={pending} className="grid gap-3 rounded-2xl border p-4"><legend className="text-xl font-black">הוספת מקטע</legend>
      <select className={field} value={available.includes(selectedType)?selectedType:available[0]||""}
        onChange={event=>setSelectedType(event.target.value as HomeBlock["type"])}>
        {available.map(type=><option key={type} value={type}>{homeBlockDefinitions[type as HomeBlockType]?.label||blockDefinitions[type as keyof typeof blockDefinitions]?.label}</option>)}
      </select><button className={button} type="button" disabled={!available.length||blocks.length>=50}
        onClick={addBlock}>הוספת מקטע</button>
    </fieldset>
    <p role="status">{dirty?"יש שינויים בטופס שטרם נשמרו. התצוגה המדויקת מציגה רק גרסה שמורה.":"כל השינויים בטופס נשמרו בטיוטה."}</p>
    {state.message&&<p role={state.ok?"status":"alert"}>{state.message}</p>}
    <div className="flex flex-wrap gap-3"><button className="btn-primary" name="intent" value="save" disabled={pending}>שמירת טיוטה</button>
      <Link className="btn-secondary" prefetch={false} href={`/admin/preview/pages/home?revision=${snapshot.draftRevisionId}`}>תצוגה מקדימה מדויקת</Link></div>
    <label className="flex gap-2"><input type="checkbox" name="confirmPublish" value="yes" disabled={pending||dirty}/>אני מאשר/ת לפרסם את הגרסה השמורה</label>
    <button className="btn-primary justify-self-start" name="intent" value="publish" disabled={pending||dirty||snapshot.draftRevisionId===snapshot.publishedRevisionId}>פרסום</button>
  </form>;
}

export function RestoreHomeRevision({snapshot,source}:{snapshot:HomeSnapshot;source:string}) {
  const [state,action,pending]=useActionState(homeAction,initialAction);
  return <form action={action} className="grid gap-2"><input type="hidden" name="generation" value={snapshot.generation}/>
    <input type="hidden" name="revision" value={snapshot.draftRevisionId}/><input type="hidden" name="source" value={source}/>
    <button className={button} name="intent" value="restore" disabled={pending}>שחזור כטיוטה חדשה</button>
    {state.message&&<p role={state.ok?"status":"alert"}>{state.message}</p>}</form>;
}
