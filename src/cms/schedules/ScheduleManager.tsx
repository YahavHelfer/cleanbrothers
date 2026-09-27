"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { managedServiceKeys } from "@/content/service-registry";
import { scheduleAction } from "./actions";
import { utcToJerusalemLocal, type Placement, type PromotionSchedule } from "./model";
import type { PromotionChoice } from "./repository";

const subscribe = () => () => {};
function useReady() { return useSyncExternalStore(subscribe, () => true, () => false); }
const initial = { ok: false, message: "" };
const field = "field w-full";
const button = "rounded-xl border px-4 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise";
const statusText: Record<PromotionSchedule["status"], string> = {
  draft: "טיוטה", scheduled: "מתוזמן", active: "פעיל", completed: "הושלם",
  cancelled: "בוטל", failed: "נכשל",
};
function Placements({ selected = [] }: { selected?: Placement[] }) {
  const keys = new Set(selected.map(row => `${row.kind}:${row.target}`));
  return <fieldset className="grid gap-2"><legend className="font-bold">מיקומים מפורשים</legend>
    <label><input type="checkbox" name="placement" value="home:home" defaultChecked={keys.has("home:home")} /> באנר דף הבית</label>
    <label><input type="checkbox" name="placement" value="global:site" defaultChecked={keys.has("global:site")} /> באנר גלובלי</label>
    {managedServiceKeys.map(key => <label key={key}><input type="checkbox" name="placement" value={`service:${key}`}
      defaultChecked={keys.has(`service:${key}`)} /> שירות: {key}</label>)}
  </fieldset>;
}
function ScheduleFields({ choices, schedule }: { choices: PromotionChoice[]; schedule?: PromotionSchedule }) {
  const chosen = choices.find(item => item.revisionId === schedule?.promotionRevisionId) ?? choices[0];
  return <div className="grid gap-4">
    <input type="hidden" name="documentId" value={schedule?.promotionDocumentId ?? chosen?.documentId ?? ""} />
    <label className="grid gap-1 font-bold">שם פנימי
      <input className={field} name="label" maxLength={120} required defaultValue={schedule?.label ?? ""} /></label>
    <label className="grid gap-1 font-bold">גרסת מבצע מדויקת שפורסמה בעבר
      <select className={field} name="revisionId" defaultValue={schedule?.promotionRevisionId ?? chosen?.revisionId ?? ""} required>
        {choices.map(item => <option value={item.revisionId} key={item.revisionId}>גרסה {item.number} — {item.title}</option>)}
      </select></label>
    <p className="text-sm">כל הזמנים מוזנים לפי Asia/Jerusalem ונשמרים ב־UTC. שעה חסרה או כפולה במעבר שעון קיץ תידחה.</p>
    <label className="grid gap-1 font-bold">תחילת המבצע — שעון ירושלים
      <input className={field} name="startLocal" type="datetime-local" required
        defaultValue={schedule ? utcToJerusalemLocal(schedule.startsAt) : ""} /></label>
    <label className="grid gap-1 font-bold">סיום — שעון ירושלים (אופציונלי)
      <input className={field} name="endLocal" type="datetime-local"
        defaultValue={schedule?.endsAt ? utcToJerusalemLocal(schedule.endsAt) : ""} /></label>
    <Placements selected={schedule?.placements} />
  </div>;
}
function FormMessage({ state }: { state: typeof initial }) {
  return state.message ? <p role="status" className={state.ok ? "text-turquoise-dark" : "text-red-700"}>{state.message}</p> : null;
}
function CreateForm({ choices }: { choices: PromotionChoice[] }) {
  const [state, action, pending] = useActionState(scheduleAction, initial);
  const ready = useReady();
  return <form action={action} className="grid gap-4 rounded-2xl border theme-card p-5">
    <h2 className="text-xl font-black">תזמון חדש כטיוטה</h2>
    <input type="hidden" name="intent" value="create" />
    <ScheduleFields choices={choices} />
    <button className={button} disabled={!ready || pending || choices.length === 0}>שמירת טיוטה</button>
    <FormMessage state={state} />
  </form>;
}
function Existing({ schedule, choices }: { schedule: PromotionSchedule; choices: PromotionChoice[] }) {
  const [state, action, pending] = useActionState(scheduleAction, initial);
  const ready = useReady();
  return <article className="grid gap-4 rounded-2xl border theme-card p-5">
    <h2 className="text-xl font-black">{schedule.label}</h2>
    <p>מצב: {statusText[schedule.status]} · גרסת מבצע {schedule.promotionRevisionNumber} · גרסת תזמון {schedule.version}</p>
    <p>תחילה: {utcToJerusalemLocal(schedule.startsAt)} Asia/Jerusalem
      {schedule.endsAt ? ` · סיום: ${utcToJerusalemLocal(schedule.endsAt)} Asia/Jerusalem` : " · ללא סיום"}</p>
    <p>מיקומים: {schedule.placements.map(item => `${item.kind}:${item.target}`).join(", ")}</p>
    <Link href={`/admin/preview/promotions/schedules/${schedule.id}`} prefetch={false}>תצוגה מקדימה פרטית למיקום</Link>
    {schedule.status === "draft" && <form action={action} className="grid gap-4">
      <input type="hidden" name="intent" value="edit" /><input type="hidden" name="id" value={schedule.id} />
      <input type="hidden" name="version" value={schedule.version} />
      <ScheduleFields choices={choices} schedule={schedule} />
      <button className={button} disabled={!ready || pending}>עדכון טיוטה</button>
    </form>}
    {(schedule.status === "draft" || schedule.status === "scheduled" || schedule.status === "active" ||
      schedule.status === "failed") && <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={schedule.id} /><input type="hidden" name="version" value={schedule.version} />
      <label><input type="checkbox" name="confirm" value="yes" required /> אני מאשר/ת את שינוי המצב</label>
      {schedule.status === "draft" && <button className={button} name="intent" value="schedule" disabled={!ready || pending}>קיבוע ותזמון</button>}
      {schedule.status === "failed" && schedule.retryable &&
        <button className={button} name="intent" value="retry" disabled={!ready || pending}>ניסיון חוזר</button>}
      <button className={button} name="intent" value="cancel" disabled={!ready || pending}>ביטול תזמון</button>
    </form>}
    <FormMessage state={state} />
    <details><summary>היסטוריית ביצוע בטוחה</summary>
      {schedule.attempts.length ? <ol className="list-decimal pe-6">{schedule.attempts.map(attempt =>
        <li key={`${attempt.action}-${attempt.number}`}>{attempt.action} · ניסיון {attempt.number} · {attempt.outcome}
          {attempt.failureCategory ? ` · ${attempt.failureCategory}` : ""} · {attempt.attemptedAt}</li>)}</ol>
        : <p>טרם בוצעו ניסיונות.</p>}
    </details>
  </article>;
}
export function ScheduleManager({ schedules, choices }: { schedules: PromotionSchedule[]; choices: PromotionChoice[] }) {
  return <div className="grid gap-8"><CreateForm choices={choices} />
    <section className="grid gap-5"><h2 className="text-2xl font-black">תזמונים</h2>
      {schedules.length ? schedules.map(schedule => <Existing key={`${schedule.id}-${schedule.version}`}
        schedule={schedule} choices={choices} />) : <p>עדיין אין תזמונים.</p>}
    </section></div>;
}
