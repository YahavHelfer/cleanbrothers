import { MAX_IMAGE_EDGE, MAX_IMAGE_PIXELS } from "./model";

// Decode JPEGs in the browser and upload a fresh pixel-only JPEG. Phone exports
// may contain auxiliary data that a browser displays but strict containers reject.
// PNG/WebP remain unchanged so their animation/container checks still run server-side.
export async function prepareUploadImage(file: File, maxBytes: number): Promise<File> {
  if (file.type !== "image/jpeg") return file;
  const url = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement("canvas");
  try {
    image.src = url;
    await image.decode();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE ||
      width * height > MAX_IMAGE_PIXELS)
      throw new Error("ממדי התמונה חורגים מהמותר. בחרו תמונה קטנה יותר.");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("לא ניתן להכין את התמונה בדפדפן זה.");
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("הכנת התמונה נכשלה.")),
        "image/jpeg", 0.95);
    });
    if (blob.type !== "image/jpeg" || !blob.size || blob.size > maxBytes)
      throw new Error("התמונה המעובדת גדולה מדי. בחרו תמונה קטנה יותר.");
    return new File([blob], file.name, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
