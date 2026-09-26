"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import type { MediaChoice } from "@/cms/media/model";
import { pageAction, promotionAction } from "./actions";
import { newPageAction } from "./new-actions";
import type { NewPageSnapshot } from "./new-repository";
import { blockDefinitions, defaultBlock, internalRoutes, validatePageDraft,
  type BlockType, type Inline, type PageBlock, type PageDraft, type PromotionDraft, type RichNode,
  type SafeCta, type SafeTarget } from "./model";
import type { PageSnapshot, PromotionSnapshot } from "./repository";

const initialAction = { ok: false, message: "" };
const subscribe = () => () => {};
function useReady() { return useSyncExternalStore(subscribe, () => true, () => false); }
const button = "rounded-xl border px-3 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise";
const field = "field w-full";
function Text({ label, value, onChange, max = 2000, multi = false }: {
  label: string; value: string; onChange: (value: string) => void; max?: number; multi?: boolean;
}) {
  return <label className="grid gap-2 font-bold">{label}
    {multi ? <textarea className={`${field} min-h-24`} value={value} maxLength={max} required onChange={event => onChange(event.target.value)} />
      : <input className={field} value={value} maxLength={max} required onChange={event => onChange(event.target.value)} />}
  </label>;
}
function TargetFields({ target, onChange }: { target: SafeTarget; onChange: (value: SafeTarget) => void }) {
  return <div className="grid gap-3 rounded-xl border p-3">
    <label className="grid gap-2">סוג יעד
      <select className={field} value={target.kind} onChange={event => {
        const kind = event.target.value;
        onChange(kind === "phone" ? { kind: "phone" } : kind === "whatsapp"
          ? { kind: "whatsapp", message: "היי, אשמח לקבל פרטים." } : { kind: "internal", path: "/contact" });
      }}>
        <option value="internal">עמוד באתר</option><option value="phone">שיחת טלפון</option><option value="whatsapp">WhatsApp דרך מערכת האתר</option>
      </select>
    </label>
    {target.kind === "internal" && <label className="grid gap-2">עמוד יעד
      <select className={field} value={target.path} onChange={event => onChange({ kind: "internal", path: event.target.value as (typeof internalRoutes)[number] })}>
        {internalRoutes.map(path => <option key={path} value={path}>{path}</option>)}
      </select></label>}
    {target.kind === "whatsapp" && <Text label="הודעה מוצעת" value={target.message} max={300}
      onChange={message => onChange({ kind: "whatsapp", message })} />}
  </div>;
}
function CtaFields({ cta, onChange, optional = false }: { cta: SafeCta | null; onChange: (value: SafeCta | null) => void; optional?: boolean }) {
  return <div className="grid gap-3 rounded-xl border p-3">
    {optional && <label className="flex items-center gap-2"><input type="checkbox" checked={cta !== null}
      onChange={event => onChange(event.target.checked ? { label: "צרו קשר", target: { kind: "internal", path: "/contact" } } : null)} />הצגת כפתור</label>}
    {cta && <><Text label="טקסט כפתור" value={cta.label} max={120} onChange={label => onChange({ ...cta, label })} />
      <TargetFields target={cta.target} onChange={target => onChange({ ...cta, target })} /></>}
  </div>;
}
function MediaFields({ value, alt, choices, onChange }: { value: string | null; alt: string | null; choices: MediaChoice[];
  onChange: (id: string | null, alt: string | null) => void }) {
  return <div className="grid gap-3 rounded-xl border p-3">
    <label className="grid gap-2">גרסת מדיה מדויקת
      <select className={field} value={value || ""} onChange={event => {
        const selected = choices.find(choice => choice.versionId === event.target.value);
        onChange(selected?.versionId || null, selected?.altText || null);
      }}><option value="">ללא תמונה</option>
        {choices.filter(choice => !choice.archived || choice.versionId === value).map(choice =>
          <option key={choice.versionId} value={choice.versionId}>{choice.label} — גרסה {choice.number}</option>)}
      </select>
    </label>
    {value && <Text label="תיאור חלופי הקשרי" value={alt || ""} max={300} onChange={next => onChange(value, next)} />}
  </div>;
}
const blankInline = (): Inline => ({ text: "טקסט חדש", bold: false, emphasis: false, link: null });
function RichFields({ nodes, onChange }: { nodes: RichNode[]; onChange: (nodes: RichNode[]) => void }) {
  const updateNode = (index: number, value: RichNode) => onChange(nodes.map((node, i) => i === index ? value : node));
  return <div className="grid gap-4">
    {nodes.map((node, index) => <fieldset key={index} className="grid gap-3 rounded-xl border p-4">
      <legend className="font-black">פריט טקסט {index + 1}</legend>
      <label className="grid gap-2">מבנה
        <select className={field} value={node.kind} onChange={event => {
          const kind = event.target.value as RichNode["kind"];
          updateNode(index, { kind, level: kind === "heading" ? 2 : null,
            items: [node.items[0] || [blankInline()]] });
        }}><option value="paragraph">פסקה</option><option value="heading">כותרת</option>
          <option value="unordered">רשימת תבליטים</option><option value="ordered">רשימה ממוספרת</option></select>
      </label>
      {node.kind === "heading" && <label className="grid gap-2">דרגת כותרת
        <select className={field} value={node.level || 2} onChange={event => updateNode(index, { ...node, level: Number(event.target.value) as 2 | 3 })}>
          <option value="2">כותרת משנה</option><option value="3">כותרת פנימית</option></select></label>}
      {node.items.map((item, itemIndex) => <div key={itemIndex} className="grid gap-3 rounded-xl border p-3">
        <p className="font-bold">{["unordered", "ordered"].includes(node.kind) ? `שורת רשימה ${itemIndex + 1}` : "תוכן"}</p>
        {item.map((inline, inlineIndex) => <div key={inlineIndex} className="grid gap-3 border-b pb-3">
          <Text label={`מקטע ${inlineIndex + 1}`} value={inline.text} max={1000} multi onChange={value =>
            updateNode(index, { ...node, items: node.items.map((current, i) => i === itemIndex ?
              current.map((entry, j) => j === inlineIndex ? { ...entry, text: value } : entry) : current) })} />
          <div className="flex flex-wrap gap-4">
            <label><input type="checkbox" checked={inline.bold} onChange={event => updateNode(index, { ...node,
              items: node.items.map((current, i) => i === itemIndex ? current.map((entry, j) => j === inlineIndex ? { ...entry, bold: event.target.checked } : entry) : current) })} /> מודגש</label>
            <label><input type="checkbox" checked={inline.emphasis} onChange={event => updateNode(index, { ...node,
              items: node.items.map((current, i) => i === itemIndex ? current.map((entry, j) => j === inlineIndex ? { ...entry, emphasis: event.target.checked } : entry) : current) })} /> נטוי</label>
            <label><input type="checkbox" checked={inline.link !== null} onChange={event => updateNode(index, { ...node,
              items: node.items.map((current, i) => i === itemIndex ? current.map((entry, j) => j === inlineIndex ?
                { ...entry, link: event.target.checked ? { kind: "internal", path: "/contact" } : null } : entry) : current) })} /> קישור</label>
          </div>
          {inline.link && <TargetFields target={inline.link} onChange={link => updateNode(index, { ...node,
            items: node.items.map((current, i) => i === itemIndex ? current.map((entry, j) => j === inlineIndex ? { ...entry, link } : entry) : current) })} />}
          <button className={button} type="button" disabled={item.length <= 1} onClick={() => updateNode(index, { ...node,
            items: node.items.map((current, i) => i === itemIndex ? current.filter((_, j) => j !== inlineIndex) : current) })}>הסרת מקטע</button>
        </div>)}
        <button className={button} type="button" disabled={item.length >= 20} onClick={() => updateNode(index, { ...node,
          items: node.items.map((current, i) => i === itemIndex ? [...current, blankInline()] : current) })}>הוספת מקטע</button>
        {["unordered", "ordered"].includes(node.kind) && <button className={button} type="button" disabled={node.items.length <= 1}
          onClick={() => updateNode(index, { ...node, items: node.items.filter((_, i) => i !== itemIndex) })}>הסרת שורה</button>}
      </div>)}
      {["unordered", "ordered"].includes(node.kind) && <button className={button} type="button" disabled={node.items.length >= 12}
        onClick={() => updateNode(index, { ...node, items: [...node.items, [blankInline()]] })}>הוספת שורת רשימה</button>}
      <button className={button} type="button" disabled={nodes.length <= 1} onClick={() => onChange(nodes.filter((_, i) => i !== index))}>הסרת פריט טקסט</button>
    </fieldset>)}
    <button className={button} type="button" disabled={nodes.length >= 30}
      onClick={() => onChange([...nodes, { kind: "paragraph", level: null, items: [[blankInline()]] }])}>הוספת פסקה</button>
  </div>;
}

function BlockFields({ block, onChange, choices, promotionRevisions }: { block: PageBlock; onChange: (block: PageBlock) => void;
  choices: MediaChoice[]; promotionRevisions: { id: string; number: number }[] }) {
  const p = block.payload;
  const update = (key: string, value: unknown) => onChange({ ...block, payload: { ...p, [key]: value } });
  switch (block.type) {
    case "hero": return <div className="grid gap-3"><Text label="כותרת קטנה" value={p.eyebrow as string} max={120} onChange={value => update("eyebrow", value)} />
      <Text label="כותרת ראשית" value={p.title as string} max={180} onChange={value => update("title", value)} />
      <Text label="תיאור" value={p.description as string} multi onChange={value => update("description", value)} />
      <CtaFields cta={p.cta as SafeCta | null} optional onChange={value => update("cta", value)} />
      <MediaFields value={block.mediaVersionId} alt={p.mediaAlt as string | null} choices={choices}
        onChange={(mediaVersionId, mediaAlt) => onChange({ ...block, mediaVersionId, payload: { ...p, mediaAlt } })} /></div>;
    case "richText": return <RichFields nodes={p.nodes as RichNode[]} onChange={value => update("nodes", value)} />;
    case "imageText": return <div className="grid gap-3"><Text label="כותרת" value={p.heading as string} max={180} onChange={value => update("heading", value)} />
      <Text label="תוכן" value={p.body as string} multi onChange={value => update("body", value)} />
      <label>צד התמונה <select className={field} value={p.side as string} onChange={event => update("side", event.target.value)}>
        <option value="start">תחילת השורה</option><option value="end">סוף השורה</option></select></label>
      <MediaFields value={block.mediaVersionId} alt={p.alt as string} choices={choices}
        onChange={(mediaVersionId, alt) => onChange({ ...block, mediaVersionId, payload: { ...p, alt: alt || "" } })} />
      <CtaFields cta={p.cta as SafeCta | null} optional onChange={value => update("cta", value)} /></div>;
    case "faq": return <div className="grid gap-3">{(p.items as { question: string; answer: string }[]).map((item, index) =>
      <div key={index} className="grid gap-3 rounded-xl border p-3"><Text label={`שאלה ${index + 1}`} value={item.question} max={300}
        onChange={question => update("items", (p.items as typeof item[]).map((row, i) => i === index ? { ...row, question } : row))} />
        <Text label={`תשובה ${index + 1}`} value={item.answer} multi onChange={answer =>
          update("items", (p.items as typeof item[]).map((row, i) => i === index ? { ...row, answer } : row))} />
        <button className={button} type="button" disabled={(p.items as unknown[]).length <= 1}
          onClick={() => update("items", (p.items as unknown[]).filter((_, i) => i !== index))}>הסרת שאלה</button></div>)}
      <button className={button} type="button" disabled={(p.items as unknown[]).length >= 20}
        onClick={() => update("items", [...(p.items as unknown[]), { question: "שאלה", answer: "תשובה" }])}>הוספת שאלה</button></div>;
    case "cta": return <div className="grid gap-3"><Text label="כותרת" value={p.heading as string} max={180} onChange={value => update("heading", value)} />
      <Text label="תיאור" value={p.description as string} multi onChange={value => update("description", value)} />
      <CtaFields cta={p.cta as SafeCta} onChange={value => update("cta", value)} /></div>;
    case "promotionBanner": return <div className="grid gap-3"><label>גרסת מבצע מדויקת
      <select className={field} value={block.promotionRevisionId || ""} onChange={event => onChange({ ...block, promotionRevisionId: event.target.value })}>
        <option value="">בחרו גרסה</option>{promotionRevisions.map(revision => <option key={revision.id} value={revision.id}>גרסה {revision.number}</option>)}
      </select></label><label>תבנית
        <select className={field} value={p.template as string} onChange={event => update("template", event.target.value)}>
          <option value="accent">מודגשת</option><option value="quiet">שקטה</option></select></label></div>;
    case "spacer": return <div className="grid gap-3"><label>גודל
      <select className={field} value={p.size as string} onChange={event => update("size", event.target.value)}>
        <option value="compact">קטן</option><option value="normal">רגיל</option><option value="wide">רחב</option></select></label>
      <label>מראה <select className={field} value={p.variant as string} onChange={event => update("variant", event.target.value)}>
        <option value="divider">קו מפריד</option><option value="space">מרווח בלבד</option></select></label></div>;
    case "aboutOverview": return <div className="grid gap-3"><Text label="כותרת המקטע" value={p.heading as string} max={180} onChange={value => update("heading", value)} />
      {(p.paragraphs as string[]).map((paragraph, index) => <div className="grid gap-2" key={index}>
        <Text label={`פסקה ${index + 1}`} value={paragraph} multi onChange={value => update("paragraphs", (p.paragraphs as string[]).map((row, i) => i === index ? value : row))} />
        <button className={button} type="button" disabled={(p.paragraphs as string[]).length <= 1}
          onClick={() => update("paragraphs", (p.paragraphs as string[]).filter((_, i) => i !== index))}>הסרת פסקה</button></div>)}
      <button className={button} type="button" disabled={(p.paragraphs as string[]).length >= 6}
        onClick={() => update("paragraphs", [...(p.paragraphs as string[]), "פסקה חדשה"])}>הוספת פסקה</button>
      {(p.values as { title: string; description: string; icon: string }[]).map((value, index) => <div key={index} className="grid gap-3 rounded-xl border p-3">
        <Text label={`ערך ${index + 1}`} value={value.title} max={120} onChange={title => update("values", (p.values as typeof value[]).map((row, i) => i === index ? { ...row, title } : row))} />
        <Text label="תיאור הערך" value={value.description} max={500} multi onChange={description => update("values", (p.values as typeof value[]).map((row, i) => i === index ? { ...row, description } : row))} />
        <label>סמל <select className={field} value={value.icon} onChange={event => update("values", (p.values as typeof value[]).map((row, i) => i === index ? { ...row, icon: event.target.value } : row))}>
          {(["shield", "message", "calendar", "sparkles"] as const).map(icon => <option key={icon} value={icon}>{icon}</option>)}
        </select></label><button className={button} type="button" disabled={(p.values as unknown[]).length <= 1}
          onClick={() => update("values", (p.values as unknown[]).filter((_, i) => i !== index))}>הסרת ערך</button></div>)}
      <button className={button} type="button" disabled={(p.values as unknown[]).length >= 6}
        onClick={() => update("values", [...(p.values as unknown[]), { title: "ערך", description: "תיאור", icon: "shield" }])}>הוספת ערך</button>
    </div>;
  }
}

export function PageEditor({ snapshot, mediaChoices, promotionRevisions, pageId }: { snapshot: PageSnapshot | NewPageSnapshot;
  mediaChoices: MediaChoice[]; promotionRevisions: { id: string; number: number }[]; pageId?: string }) {
  const [draft, setDraft] = useState<PageDraft>(() => validatePageDraft(snapshot.draft));
  const [selectedType, setSelectedType] = useState<BlockType>("richText");
  const [state, action, actionPending] = useActionState(pageId ? newPageAction.bind(null,pageId) : pageAction, initialAction);
  const ready = useReady();
  const pending = actionPending || !ready;
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.draft);
  const blocks = draft.blocks;
  const reorder = (next: PageBlock[]) => setDraft(current => ({ ...current,
    blocks: next.map((block, position) => ({ ...block, position })) }));
  const update = (index: number, value: PageBlock) => reorder(blocks.map((block, i) => i === index ? value : block));
  return <form action={action} aria-label={pageId ? "עריכת עמוד" : "עריכת עמוד אודות"} className="grid gap-7 rounded-3xl border theme-card p-5 sm:p-8" dir="rtl">
    <input type="hidden" name="generation" value={snapshot.generation} />
    <input type="hidden" name="revision" value={snapshot.draftRevisionId} />
    <input type="hidden" name="payload" value={JSON.stringify(draft)} />
    <fieldset disabled={pending} className="grid gap-4"><legend className="text-xl font-black">פרטי העמוד ו־SEO</legend>
      {(["publicTitle", "h1", "seoTitle", "seoDescription"] as const).map(key =>
        <Text key={key} label={{ publicTitle: "שם העמוד", h1: "כותרת ראשית", seoTitle: "כותרת SEO", seoDescription: "תיאור SEO" }[key]}
          value={draft[key]} max={key === "seoDescription" ? 320 : key === "h1" ? 180 : 120}
          multi={key === "seoDescription"} onChange={value => setDraft(current => key === "h1"
            ? { ...current, h1: value, blocks: current.blocks.map(block => block.type === "hero"
              ? { ...block, payload: { ...block.payload, title: value } } : block) }
            : { ...current, [key]: value })} />)}
      {pageId ? <><label className="grid gap-2 font-bold">כתובת העמוד לאחר פרסום
        <input className={field} dir="ltr" value={draft.canonical.slice(1)} minLength={3} maxLength={64}
          pattern="[a-z0-9]+(-[a-z0-9]+)*" required
          onChange={event => setDraft(current => ({ ...current, canonical: `/${event.target.value}` }))} /></label>
        <p>שינוי כתובת בטיוטה אינו משנה את הנתיב הציבורי עד פרסום. הכתובת הישנה תהפוך להפניה קבועה.</p></>
        : <p>כתובת קבועה: <bdi>/about</bdi></p>}
    </fieldset>
    <fieldset disabled={pending} className="grid gap-4"><legend className="text-xl font-black">בלוקים לפי סדר הופעה</legend>
      {blocks.map((block, index) => <section key={block.id} data-block-id={block.id} className="grid gap-4 rounded-2xl border theme-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black">{index + 1}. {blockDefinitions[block.type].label}</h3>
          <p>{block.hidden ? "מוסתר בגרסה זו" : "מוצג בגרסה זו"}</p></div>
        <div className="flex flex-wrap gap-2">
          <button className={button} type="button" disabled={index === 0} aria-label={`הזז למעלה: ${blockDefinitions[block.type].label}`}
            onClick={() => { const next = [...blocks]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; reorder(next); }}>הזז למעלה</button>
          <button className={button} type="button" disabled={index === blocks.length - 1} aria-label={`הזז למטה: ${blockDefinitions[block.type].label}`}
            onClick={() => { const next = [...blocks]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; reorder(next); }}>הזז למטה</button>
          <button className={button} type="button" disabled={blocks.length >= 50 || block.type === "hero"}
            onClick={() => reorder([...blocks.slice(0, index + 1), { ...structuredClone(block), id: crypto.randomUUID() }, ...blocks.slice(index + 1)])}>שכפול</button>
          <button className={button} type="button" disabled={block.type === "hero"}
            onClick={() => update(index, { ...block, hidden: !block.hidden })}>{block.hidden ? "הצג" : "הסתר"}</button>
          <button className={button} type="button" disabled={block.type === "hero"}
            onClick={() => reorder(blocks.filter((_, i) => i !== index))}>הסרה מהטיוטה</button>
        </div>
        <BlockFields block={block} onChange={value => {
          update(index, value);
          if (value.type === "hero" && value.payload.title !== block.payload.title)
            setDraft(current => ({ ...current, h1: value.payload.title as string }));
        }} choices={mediaChoices} promotionRevisions={promotionRevisions} />
      </section>)}
    </fieldset>
    <fieldset disabled={pending} className="grid gap-3 rounded-2xl border p-4"><legend className="text-xl font-black">הוספת בלוק</legend>
      <div className="grid gap-2 sm:grid-cols-2">{(Object.keys(blockDefinitions) as BlockType[]).map(type =>
        <label key={type} className="flex gap-2 rounded-xl border p-3"><input type="radio" name="blockTemplate" value={type} checked={selectedType === type}
          onChange={() => setSelectedType(type)} disabled={type === "hero" && blocks.some(block => block.type === "hero")} />
          <span><b>{blockDefinitions[type].label}</b><br /><small>{blockDefinitions[type].description}</small></span></label>)}</div>
      <button className={button} type="button" disabled={blocks.length >= 50 || (selectedType === "hero" && blocks.some(block => block.type === "hero"))}
        onClick={() => reorder([...blocks, defaultBlock(selectedType, blocks.length, promotionRevisions[0]?.id)])}>הוספת בלוק</button>
    </fieldset>
    <p role="status">{dirty ? "יש שינויים בטופס שטרם נשמרו. תצוגה מקדימה מציגה רק גרסה שמורה." : "כל השינויים בטופס נשמרו בטיוטה."}</p>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
    <div className="flex flex-wrap gap-3"><button className="btn-primary" name="intent" value="save" disabled={pending}>שמירת טיוטה</button>
      <Link className="btn-secondary" prefetch={false} href={`/admin/preview/pages/${pageId || "about"}?revision=${snapshot.draftRevisionId}`}>תצוגה מקדימה מדויקת</Link></div>
    <label className="flex gap-2"><input type="checkbox" name="confirmPublish" value="yes" disabled={pending || dirty} />אני מאשר/ת לפרסם את הגרסה השמורה</label>
    <button className="btn-primary justify-self-start" name="intent" value="publish"
      disabled={pending || dirty || snapshot.draftRevisionId === snapshot.publishedRevisionId}>פרסום</button>
  </form>;
}

export function RestorePageRevision({ snapshot, source, pageId }: { snapshot: PageSnapshot | NewPageSnapshot; source: string; pageId?: string }) {
  const [state, action, pending] = useActionState(pageId ? newPageAction.bind(null,pageId) : pageAction, initialAction);
  return <form action={action} className="grid gap-2"><input type="hidden" name="generation" value={snapshot.generation} />
    <input type="hidden" name="revision" value={snapshot.draftRevisionId} /><input type="hidden" name="source" value={source} />
    <button className={button} name="intent" value={pageId ? "restore-revision" : "restore"} disabled={pending}>שחזור כטיוטה חדשה</button>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}</form>;
}

export function PromotionEditor({ snapshot, mediaChoices }: { snapshot: PromotionSnapshot; mediaChoices: MediaChoice[] }) {
  const [draft, setDraft] = useState<PromotionDraft>(snapshot.draft);
  const [state, action, actionPending] = useActionState(promotionAction, initialAction);
  const ready = useReady();
  const pending = actionPending || !ready;
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.draft);
  return <form action={action} className="grid gap-5 rounded-3xl border theme-card p-5" aria-label="עריכת מבצע" dir="rtl">
    <input type="hidden" name="generation" value={snapshot.generation} /><input type="hidden" name="revision" value={snapshot.draftRevisionId} />
    <input type="hidden" name="payload" value={JSON.stringify(draft)} />
    <fieldset disabled={pending} className="grid gap-4"><legend className="text-xl font-black">תוכן המבצע</legend>
      {(["publicTitle", "h1", "seoTitle", "seoDescription", "description"] as const).map(key => <Text key={key}
        label={{ publicTitle: "שם פנימי", h1: "כותרת המבצע", seoTitle: "כותרת SEO", seoDescription: "תיאור SEO", description: "תיאור המבצע" }[key]}
        value={draft[key]} max={key === "description" ? 2000 : key === "seoDescription" ? 320 : key === "h1" ? 180 : 120}
        multi={["description", "seoDescription"].includes(key)} onChange={value => setDraft(current => ({ ...current, [key]: value }))} />)}
      <label>תבנית <select className={field} value={draft.template} onChange={event => setDraft(current => ({ ...current, template: event.target.value as PromotionDraft["template"] }))}>
        <option value="accent">מודגשת</option><option value="quiet">שקטה</option></select></label>
      <label><input type="checkbox" checked={draft.enabled} onChange={event => setDraft(current => ({ ...current, enabled: event.target.checked }))} /> המבצע מוצג בבלוק שמפנה לגרסה זו</label>
      <CtaFields cta={draft.cta} onChange={value => { if (value) setDraft(current => ({ ...current, cta: value })); }} />
      <MediaFields value={draft.mediaVersionId} alt={draft.mediaAlt} choices={mediaChoices}
        onChange={(mediaVersionId, mediaAlt) => setDraft(current => ({ ...current, mediaVersionId, mediaAlt }))} />
    </fieldset>
    <p>זהות אנליטית קבועה: <bdi>{snapshot.analyticsIdentity}</bdi></p>
    <p role="status">{dirty ? "יש שינויים שלא נשמרו." : "הטיוטה שמורה."}</p>
    {state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}
    <button name="intent" value="save" className="btn-primary justify-self-start" disabled={pending}>שמירת טיוטה</button>
    <label><input type="checkbox" name="confirmPublish" value="yes" disabled={pending || dirty} />אני מאשר/ת לפרסם את גרסת המבצע</label>
    <button name="intent" value="publish" className="btn-primary justify-self-start"
      disabled={pending || dirty || snapshot.draftRevisionId === snapshot.publishedRevisionId}>פרסום המבצע</button>
  </form>;
}
