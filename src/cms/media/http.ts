import "server-only";
import { Buffer } from "node:buffer";
import { MediaError, MAX_IMAGE_BYTES } from "./model";
export const privateMediaHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};
export async function boundedUploadForm(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (!type.startsWith("multipart/form-data;") || !request.body)
    throw new MediaError();
  const limit = MAX_IMAGE_BYTES + 64 * 1024;
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit))
    throw new MediaError("הקובץ גדול מדי.", 413);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new MediaError("הקובץ גדול מדי.", 413);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": type },
  }).formData();
}
