"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { contentAction } from "./actions";
import { previewHref, useEditorReady } from "./ServiceEditor";
import { specialContracts, validateSpecialContent, type Contract, type SpecialContent } from "./special-model";
import type { ServiceEditorSnapshot } from "./repository";
import type { SpecialServiceKey } from "@/content/service-registry";
import type { MediaChoice } from "@/cms/media/model";

const labels: Record<string, string> = {
 publicTitle:"שם השירות לתצוגה", h1:"כותרת ראשית", seoTitle:"כותרת SEO", seoDescription:"תיאור SEO", copy:"תוכן העמוד",
 trustItems:"מסרי אמון", airConditionerServiceAreas:"אזורי שירות", intentSignals:"סימנים להזמנת ניקוי", cleaningAreas:"חלקים לניקוי",
 processSteps:"שלבי העבודה", includedItems:"מה כולל השירות", propertyTypes:"סוגי נכסים", process:"שלבי העבודה", faqs:"שאלות נפוצות",
 question:"שאלה", answer:"תשובה", title:"כותרת", description:"תיאור", text:"תוכן", serviceDescription:"תיאור השירות בנתונים המובנים", keywords:"מילות מפתח",
 promotion:"מחיר ומבצע", enabled:"הצגת המבצע", startingPrice:"מחיר מבצע התחלתי בש״ח", regularPrice:"מחיר רגיל בש״ח", bundleEnabled:"הצגת הצעת 5 מזגנים ומזגן שישי ללא עלות",
 badge:"תווית המבצע בחלונית", heroLabel:"תווית המבצע בראש העמוד", pricePrefix:"טקסט לפני המחיר", cta:"טקסט כפתור", priceTerms:"תנאי המחיר", bundleTerms:"תנאי מבצע המזגן השישי",
 media:"תמונות", hero:"תמונות ראש העמוד", gallery:"גלריה", seo:"תמונת שיתוף", alt:"תיאור חלופי", versionId:"תמונה מספריית המדיה",
 callCta:"טקסט לחיוג", callPrefix:"טקסט לפני מספר הטלפון", imageCaption:"כיתוב תמונות", servicesCta:"קישור לכל השירותים", quoteCta:"טקסט להצעת מחיר",
};
const sections: Record<string,string>={hero:"ראש העמוד",signs:"סימנים",cleaning:"היקף הניקוי",technical:"מגבלות השירות",process:"תהליך",gallery:"גלריה",pricing:"מחיר",multiple:"כמה מזגנים",areas:"אזורי שירות",faq:"שאלות",contact:"יצירת קשר",included:"כלול בשירות",property:"נכסים",audience:"למי מתאים",safety:"בטיחות"};
function label(key:string):string {
 if(labels[key])return labels[key];
 const suffixes: Record<string,string>={Eyebrow:"כותרת קטנה",Title:"כותרת",Description:"תיאור",Cta:"כפתור",Note:"הערה"};
 for(const [suffix,text] of Object.entries(suffixes)) if(key.endsWith(suffix))return `${sections[key.slice(0,-suffix.length)]} — ${text}`;
 throw new Error("Missing special field label");
}
function blank(c:Contract):unknown {
 switch(c.kind){case "text":case "uuid":return "";case "number":return c.min;case "boolean":return false;case "literal":return c.value;case "list":return Array.from({length:c.min},()=>blank(c.item));case "object":return Object.fromEntries(Object.entries(c.fields).map(([k,v])=>[k,blank(v)]));}
}
function Field({contract:c,value,onChange,name,choices,path}: {contract:Contract;value:unknown;onChange:(v:unknown)=>void;name:string;choices:MediaChoice[];path:string}) {
 if(c.kind==="literal")return null;
 if(c.kind==="text")return <label className="grid gap-2">{name}<textarea className="field min-h-20" required maxLength={c.max} value={value as string} onChange={e=>onChange(e.target.value)} /></label>;
 if(c.kind==="boolean")return <label className="flex gap-3"><input type="checkbox" checked={value as boolean} onChange={e=>onChange(e.target.checked)} />{name}</label>;
 if(c.kind==="number")return <label className="grid gap-2">{name}<input className="field" type="number" min={c.min} max={c.max} step={1} required value={value as number} onChange={e=>onChange(e.target.valueAsNumber)} /></label>;
 if(c.kind==="uuid")return <label className="grid gap-2">{name}<select className="field" required value={value as string} onChange={e=>onChange(e.target.value)}><option value="" disabled>בחרו תמונה</option>{choices.filter(x=>!x.archived||x.versionId===value).map(x=><option key={x.versionId} value={x.versionId}>{x.label} — גרסה {x.number}{x.archived?" (בארכיון)":""}</option>)}</select></label>;
 if(c.kind==="object"){
  const object=value as Record<string,unknown>;
  return <fieldset className="grid gap-4 rounded-xl border p-4"><legend className="px-2 font-black">{name}</legend>{Object.entries(c.fields).filter(([,v])=>v.kind!=="literal").map(([k,rule])=><Field key={k} contract={rule} value={object[k]} name={label(k)} path={`${path}.${k}`} choices={choices} onChange={v=>onChange({...object,[k]:v})}/>)}</fieldset>;
 }
 const items=value as unknown[];
 return <fieldset className="grid gap-4 rounded-xl border p-4"><legend className="px-2 font-black">{name}</legend>{items.map((item,i)=><div key={i} className="grid gap-3"><Field contract={c.item} value={item} name={`${name} ${i+1}`} path={`${path}.${i}`} choices={choices} onChange={v=>onChange(items.map((x,j)=>j===i?v:x))}/><div className="flex gap-3"><button className="rounded border px-3 py-2" type="button" disabled={items.length<=c.min} onClick={()=>onChange(items.filter((_,j)=>j!==i))}>הסרת {name} {i+1}</button><button type="button" className="rounded border px-3 py-2" disabled={i===0} aria-label={`העלאת ${name} ${i+1}`} onClick={()=>{const next=[...items];[next[i-1],next[i]]=[next[i],next[i-1]];onChange(next);}}>↑</button></div></div>)}<button className="justify-self-start rounded border px-3 py-2" type="button" disabled={items.length>=c.max} onClick={()=>onChange([...items,blank(c.item)])}>הוספת פריט — {name}</button></fieldset>;
}
export function SpecialServiceEditor({serviceKey,snapshot,mediaChoices=[]}:{serviceKey:SpecialServiceKey;snapshot:ServiceEditorSnapshot;mediaChoices?:MediaChoice[]}) {
 const [draft,setDraft]=useState<SpecialContent>(()=>validateSpecialContent(serviceKey,snapshot.draft));
 const [state,action,actionPending]=useActionState(contentAction,{ok:false,message:""});
 const ready=useEditorReady();
 const pending=actionPending||!ready;
 const dirty=JSON.stringify(draft)!==JSON.stringify(snapshot.draft);
 return <form action={action} aria-label="עריכת השירות" className="grid gap-6 rounded-3xl border theme-card p-5" dir="rtl">
  <input type="hidden" name="serviceKey" value={serviceKey}/><input type="hidden" name="generation" value={snapshot.generation}/><input type="hidden" name="revision" value={snapshot.draftRevisionId}/><input type="hidden" name="payload" value={JSON.stringify(draft)}/>
  <fieldset disabled={pending}><Field contract={specialContracts[serviceKey]} value={draft} onChange={v=>setDraft(v as SpecialContent)} name={serviceKey==="air-conditioner-cleaning"?"תוכן ניקוי מזגנים":"תוכן ניקוי חלונות"} path="content" choices={mediaChoices}/></fieldset>
  <Link href="/admin/media" prefetch={false} className="underline">לספריית המדיה</Link>
  <p role="status">{dirty?"יש שינויים בטופס שטרם נשמרו. תצוגה מקדימה מציגה רק את הגרסה השמורה.":"כל השינויים בטופס נשמרו בטיוטה."}</p>
  {state.message&&<p role={state.ok?"status":"alert"}>{state.message}</p>}
  <div className="flex gap-4"><button name="intent" value="save" disabled={pending} className="btn-primary">שמירת טיוטה</button><Link className="btn-secondary" prefetch={false} href={previewHref(snapshot.draftRevisionId,serviceKey)}>תצוגה מקדימה</Link></div>
  <label><input type="checkbox" name="confirmPublish" value="yes" disabled={pending||dirty}/>אני מאשר/ת לפרסם את הגרסה השמורה</label>
  <button name="intent" value="publish" disabled={pending||dirty||snapshot.draftRevisionId===snapshot.publishedRevisionId} className="btn-primary justify-self-start">פרסום</button>
 </form>;
}
