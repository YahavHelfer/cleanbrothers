import { requireCmsAdmin } from "@/cms/authorization";
import { mediaUploadOriginAllowed, mediaUploadEnabled } from "@/cms/media/environment";
import { boundedUploadForm, privateMediaHeaders } from "@/cms/media/http";
import { uploadMedia } from "@/cms/media/repository";
import { MediaError } from "@/cms/media/model";
import { randomUUID } from "node:crypto";
import { mediaUploadStep, reportMediaUploadFailure } from "@/cms/media/upload-diagnostics";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireCmsAdmin();
    if (!mediaUploadEnabled())
      throw new MediaError("העלאת מדיה אינה זמינה בסביבה זו.", 503);
    // Exact approved origin and received Host; never trust forwarded headers.
    if (!mediaUploadOriginAllowed(request))
      return Response.json(
        { message: "הבקשה אינה מורשית." },
        { status: 403, headers: privateMediaHeaders },
      );
    const form = await mediaUploadStep("request", () => boundedUploadForm(request));
    const file = form.get("file");
    if (!(file instanceof File) || form.getAll("file").length !== 1)
      throw new MediaError("יש לבחור תמונה אחת.");
    const id = await uploadMedia(
      new Uint8Array(await file.arrayBuffer()),
      file.name,
      file.type,
      {
        altText: form.get("altText"),
        caption: form.get("caption") ?? "",
        folder: form.get("folder") ?? "",
      },
      typeof form.get("asset") === "string" && form.get("asset")
        ? String(form.get("asset"))
        : undefined,
      form.get("generation"),
    );
    return Response.json({ id }, { status: 201, headers: privateMediaHeaders });
  } catch (e) {
    const reference = randomUUID();
    reportMediaUploadFailure(e, reference);
    return Response.json(
      {
        message:
          e instanceof MediaError
            ? `${e.message} קוד בדיקה: ${reference}`
            : "ההעלאה לא הושלמה. בדקו הרשאה ונסו שוב.",
      },
      {
        status: e instanceof MediaError ? e.status : 403,
        headers: privateMediaHeaders,
      },
    );
  }
}
