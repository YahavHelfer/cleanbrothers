import { isManagedServiceKey } from "@/content/service-registry";

export type Placement = { kind: "home"; target: "home" } | { kind: "global"; target: "site" }
  | { kind: "service"; target: string };
export type ScheduleStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled" | "failed";
export type ScheduleAttempt = { action: "activate" | "expire"; intendedAt: string; attemptedAt: string;
  number: number; outcome: "success" | "skipped_window" | "retryable_failure" | "terminal_failure";
  failureCategory: string | null; completedAt: string };
export type PromotionSchedule = { id: string; promotionDocumentId: string; promotionRevisionId: string;
  promotionRevisionNumber: number; label: string; startsAt: string; endsAt: string | null;
  timezone: "Asia/Jerusalem"; status: ScheduleStatus; version: number; retryable: boolean;
  failureCategory: string | null; placements: Placement[]; attempts: ScheduleAttempt[] };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function scheduleUuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new Error("מזהה תזמון אינו תקין.");
  return value;
}
export function scheduleVersion(value: unknown): number {
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(result) || result < 1) throw new Error("גרסת התזמון אינה תקינה.");
  return result;
}
export function scheduleLabel(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 120 || /[<>\u0000-\u001f\u007f]/u.test(value))
    throw new Error("שם התזמון אינו תקין.");
  return value.trim();
}
export function validatePlacements(value: unknown): Placement[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) throw new Error("יש לבחור מיקום אחד לפחות.");
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
      Object.keys(item).sort().join(",") !== "kind,target") throw new Error("מיקום המבצע אינו תקין.");
    const { kind, target } = item as Record<string, unknown>;
    if (!((kind === "home" && target === "home") || (kind === "global" && target === "site") ||
      (kind === "service" && isManagedServiceKey(target)))) throw new Error("יעד המבצע אינו מאושר.");
    const key = `${kind}:${target}`;
    if (seen.has(key)) throw new Error("אין לבחור אותו מיקום פעמיים.");
    seen.add(key);
    return { kind, target } as Placement;
  });
}

const localPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const jerusalem = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
function localParts(date: Date) {
  return Object.fromEntries(jerusalem.formatToParts(date).map(part => [part.type, part.value]));
}
/** Rejects both nonexistent spring times and ambiguous autumn times. No browser timezone is consulted. */
export function jerusalemLocalToUtc(value: unknown): string {
  if (typeof value !== "string") throw new Error("יש להזין זמן ירושלים תקין.");
  const match = localPattern.exec(value);
  if (!match) throw new Error("יש להזין זמן ירושלים תקין.");
  const [, year, month, day, hour, minute] = match;
  const y = Number(year), m = Number(month), d = Number(day), h = Number(hour), min = Number(minute);
  const wall = Date.UTC(y, m - 1, d, h, min);
  if (y < 2020 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 ||
    new Date(wall).toISOString().slice(0, 16) !== value) throw new Error("זמן ירושלים אינו תקין.");
  const matches = [2, 3].map(hours => new Date(wall - hours * 3_600_000)).filter(candidate => {
    const parts = localParts(candidate);
    return parts.year === year && parts.month === month && parts.day === day &&
      parts.hour === hour && parts.minute === minute;
  });
  if (matches.length !== 1) throw new Error("השעה אינה חד־משמעית במעבר שעון קיץ. בחרו שעה אחרת.");
  return matches[0].toISOString();
}
export function utcToJerusalemLocal(value: string): string {
  const parts = localParts(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function validateScheduleTimes(start: unknown, end: unknown): { startsAt: string; endsAt: string | null } {
  const startsAt = jerusalemLocalToUtc(start);
  const endsAt = end === "" || end === null ? null : jerusalemLocalToUtc(end);
  if (endsAt && endsAt <= startsAt) throw new Error("שעת הסיום חייבת להיות אחרי שעת ההתחלה.");
  return { startsAt, endsAt };
}
