import "server-only";
import { error as logError } from "node:console";
import { MediaError } from "./model";

export type UploadStage = "request" | "image" | "prepare" | "storage" | "register";
const messages: Record<UploadStage, string> = {
  request: "לא ניתן לקרוא את בקשת ההעלאה. בחרו את התמונה ונסו שוב.",
  image: "התמונה לא עברה בדיקת תקינות. נסו לשמור עותק חדש כ־JPEG או PNG ולהעלות אותו.",
  prepare: "לא ניתן להכין את ההעלאה בספריית המדיה. נסו שוב לאחר רענון העמוד.",
  storage: "שמירת התמונה באחסון לא הושלמה. בדקו בספרייה לפני ניסיון נוסף.",
  register: "רישום התמונה בספרייה לא הושלם. בדקו בספרייה לפני ניסיון נוסף.",
};
export class MediaUploadFailure extends MediaError {
  constructor(public stage: UploadStage, public original: unknown) {
    const known = original instanceof MediaError;
    super(known && original.message !== new MediaError().message
      ? original.message : messages[stage], known ? original.status : 500);
  }
}
export async function mediaUploadStep<T>(stage: UploadStage, action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (error) { throw new MediaUploadFailure(stage, error); }
}
export function mediaFailureCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = "code" in error ? error.code : "name" in error ? error.name : undefined;
  return typeof code === "string" && /^[A-Za-z0-9_]{1,40}$/.test(code) ? code : undefined;
}
export function reportMediaUploadFailure(error: unknown, reference: string) {
  const failure = error instanceof MediaUploadFailure ? error : null;
  const original = failure ? failure.original : error;
  // Never log provider messages, files, metadata, credentials, or request headers.
  logError("cms_media_upload_failed", {
    reference,
    stage: failure?.stage ?? "unclassified",
    code: mediaFailureCode(original) ?? "unavailable",
  });
}
