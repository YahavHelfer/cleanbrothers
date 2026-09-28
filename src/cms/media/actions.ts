"use server";
import { revalidatePath } from "next/cache";
import { requireCmsAdmin } from "@/cms/authorization";
import { MediaError, mediaId } from "./model";
import { updateMedia } from "./repository";
export type MediaActionState = { ok: boolean; message: string };
export async function mediaAction(
  _previous: MediaActionState,
  form: FormData,
): Promise<MediaActionState> {
  try {
    await requireCmsAdmin();
    const id = mediaId(form.get("id"));
    await updateMedia(id, form.get("generation"), form.get("operation"), {
      altText: form.get("altText"),
      caption: form.get("caption"),
      folder: form.get("folder"),
    });
    revalidatePath("/admin/media");
    revalidatePath(`/admin/media/${id}`);
    revalidatePath("/admin/services");
    return { ok: true, message: "השינוי נשמר. גרסאות התוכן הקיימות לא השתנו." };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof MediaError
          ? e.message
          : "הפעולה לא הושלמה. בדקו הרשאה וטענו מחדש.",
    };
  }
}
