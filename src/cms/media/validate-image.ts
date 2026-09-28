import "server-only";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  MediaError,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_EDGE,
  MAX_IMAGE_PIXELS,
} from "./model";

export function safeOriginalFilename(raw: unknown) {
  if (
    typeof raw !== "string" ||
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(raw)
  )
    throw new MediaError("שם הקובץ אינו תקין.");
  const name = raw.normalize("NFKC");
  if (
    !/^[\p{L}\p{N}][\p{L}\p{N} ._()-]{0,119}\.(?:jpe?g|png|webp)$/iu.test(
      name,
    ) ||
    name.includes("..") ||
    /\.(?:exe|com|bat|js|svg|html?|php|sh|zip)\./i.test(name)
  )
    throw new MediaError("שם הקובץ אינו תקין.");
  return name;
}
function containerType(b: Buffer): "jpeg" | "png" | "webp" {
  // Reject active-document payloads even when embedded in image metadata.
  if (
    /<\s*(?:script|svg|html|!doctype)|<\?php/i.test(b.toString("latin1")) ||
    b.includes(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  )
    throw new MediaError("הקובץ אינו תמונה בטוחה.");
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    let pos = 8,
      first = true,
      data = false;
    while (pos + 12 <= b.length) {
      const n = b.readUInt32BE(pos),
        type = b.toString("ascii", pos + 4, pos + 8),
        end = pos + 12 + n;
      if (
        end > b.length ||
        (first && (type !== "IHDR" || n !== 13)) ||
        type === "acTL"
      )
        throw new MediaError();
      if (
        ![
          "IHDR",
          "PLTE",
          "IDAT",
          "IEND",
          "tRNS",
          "gAMA",
          "cHRM",
          "sRGB",
          "pHYs",
          "iCCP",
          "eXIf",
          "tEXt",
          "zTXt",
          "iTXt",
          "sBIT",
          "bKGD",
          "tIME",
        ].includes(type)
      )
        throw new MediaError();
      let crc = 0xffffffff;
      for (const byte of b.subarray(pos + 4, end - 4)) {
        crc ^= byte;
        for (let i = 0; i < 8; i++)
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      if ((crc ^ 0xffffffff) >>> 0 !== b.readUInt32BE(end - 4))
        throw new MediaError();
      if (type === "IDAT") data = true;
      if (type === "IEND") {
        if (n || end !== b.length || !data) throw new MediaError();
        return "png";
      }
      first = false;
      pos = end;
    }
  } else if (b[0] === 0xff && b[1] === 0xd8) {
    let pos = 2,
      scan = false;
    while (pos < b.length) {
      if (scan) {
        while (pos < b.length && b[pos] !== 0xff) pos++;
        if (b[pos + 1] === 0 || (b[pos + 1] >= 0xd0 && b[pos + 1] <= 0xd7)) {
          pos += 2;
          continue;
        }
      }
      if (b[pos++] !== 0xff) throw new MediaError();
      while (b[pos] === 0xff) pos++;
      const marker = b[pos++];
      if (marker === 0xd9) {
        if (pos !== b.length || !scan) throw new MediaError();
        return "jpeg";
      }
      if (marker === 0xd8 || marker === 0 || pos + 2 > b.length)
        throw new MediaError();
      const n = b.readUInt16BE(pos);
      if (n < 2 || pos + n > b.length) throw new MediaError();
      pos += n;
      scan = marker === 0xda;
    }
  } else if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    if (b.readUInt32LE(4) + 8 !== b.length) throw new MediaError();
    let pos = 12,
      frames = 0;
    while (pos + 8 <= b.length) {
      const type = b.toString("ascii", pos, pos + 4),
        n = b.readUInt32LE(pos + 4);
      if (
        !["VP8X", "VP8 ", "VP8L", "ALPH", "ICCP", "EXIF", "XMP "].includes(
          type,
        ) ||
        pos + 8 + n + (n % 2) > b.length
      )
        throw new MediaError();
      if (type === "VP8X" && (n !== 10 || b[pos + 8] & 2))
        throw new MediaError("תמונות מונפשות אינן נתמכות.");
      if (type === "VP8 " || type === "VP8L") frames++;
      pos += 8 + n + (n % 2);
    }
    if (pos !== b.length || frames !== 1) throw new MediaError();
    return "webp";
  }
  throw new MediaError("הקובץ פגום או שסוג התמונה אינו נתמך.");
}
let activeDecodes = 0;
export async function validateImage(
  bytes: Uint8Array,
  filename: unknown,
  claimedMime: unknown,
) {
  if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES)
    throw new MediaError("התמונה חייבת להיות בגודל עד 8 MiB.", 413);
  const originalFilename = safeOriginalFilename(filename),
    input = Buffer.from(bytes);
  const format = containerType(input);
  const expectedMime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
  const extension = originalFilename.split(".").pop()!.toLowerCase();
  if (
    claimedMime !== expectedMime ||
    !(format === "jpeg" ? ["jpg", "jpeg"] : [format]).includes(extension)
  )
    throw new MediaError("סוג הקובץ או הסיומת אינם תואמים לתוכן התמונה.");
  if (activeDecodes >= 2)
    throw new MediaError("מעובדות כעת תמונות אחרות. נסו שוב בעוד רגע.", 429);
  activeDecodes++;
  try {
    const options = {
      failOn: "warning" as const,
      limitInputPixels: MAX_IMAGE_PIXELS,
      limitInputChannels: 4,
    };
    const meta = await sharp(input, options).metadata();
    if (
      meta.format !== format ||
      !meta.width ||
      !meta.height ||
      meta.width > MAX_IMAGE_EDGE ||
      meta.height > MAX_IMAGE_EDGE ||
      meta.width * meta.height > MAX_IMAGE_PIXELS ||
      (meta.pages ?? 1) !== 1
    )
      throw new MediaError("ממדי התמונה חורגים מהמותר או שהיא מונפשת.");
    // Decode all pixels, apply orientation, convert to sRGB, re-encode from pixels.
    // No keepMetadata/withMetadata: EXIF/GPS/XMP/IPTC/ICC and comments are discarded.
    const { data, info } = await sharp(input, options)
      .autoOrient()
      .toColourspace("srgb")
      .webp({ quality: 90, effort: 4 })
      .timeout({ seconds: 5 })
      .toBuffer({ resolveWithObject: true });
    if (
      data.length > MAX_IMAGE_BYTES ||
      info.width > MAX_IMAGE_EDGE ||
      info.height > MAX_IMAGE_EDGE
    )
      throw new MediaError("התמונה המעובדת גדולה מדי.");
    return {
      bytes: data,
      mimeType: "image/webp" as const,
      width: info.width,
      height: info.height,
      byteSize: data.length,
      contentHash: createHash("sha256").update(data).digest("hex"),
      originalFilename,
    };
  } catch (error) {
    if (error instanceof MediaError) throw error;
    throw new MediaError(
      "לא ניתן לפענח את התמונה בבטחה. בחרו JPEG, PNG או WebP תקין.",
    );
  } finally {
    activeDecodes--;
  }
}
