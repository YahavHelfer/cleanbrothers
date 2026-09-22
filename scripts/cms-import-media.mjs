import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { localSql } from "./cms-local.mjs";
export function importPilotMedia() {
  const bytes = readFileSync(
    "public/images/services/delicate-upholstery-cleaning.jpeg",
  );
  if (
    bytes.length !== 132211 ||
    createHash("sha256").update(bytes).digest("hex") !==
      "b1420c216c60afec56597ccba27c5cabd2ee44f54a2904ac1b7824225e696107"
  )
    throw new Error("Static pilot image differs from approved inventory");
  const id = localSql("select public.cms_import_static_pilot_media()");
  if (id !== "d0000000-0000-4000-8000-000000000001")
    throw new Error("Unexpected local media identity");
  return id;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  importPilotMedia();
  console.log("Local pilot media imported idempotently; no file copied.");
}
