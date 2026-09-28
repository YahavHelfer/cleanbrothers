import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader } from "../tests/helpers/source-module.mjs";

function literal(value) { return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`; }

// The localSql guard rejects a linked project or any non-isolated endpoint.
export function importHomeBaseline() {
  const load = createSourceLoader();
  const { homeBaseline } = load("src/cms/home/baseline.ts");
  const { staticMediaInventory } = load("src/cms/media/static-inventory.ts");
  const pinned = new Set(homeBaseline.blocks.flatMap(block => [block.mediaVersionId,
    ...(block.type === "homeBeforeAfter" ? block.payload.items.flatMap(item =>
      [item.beforeVersionId,item.afterVersionId]) : [])].filter(Boolean)));
  for (const versionId of pinned) {
    const image = staticMediaInventory.find(item => item.versionId === versionId);
    if (!image) throw new Error("Homepage baseline media must be in the reviewed static inventory");
    const bytes = readFileSync(`public${image.path}`);
    if (bytes.length !== image.byteSize || createHash("sha256").update(bytes).digest("hex") !== image.hash)
      throw new Error("Homepage baseline image bytes differ from the reviewed inventory");
  }
  return localSql(`select public.cms_import_home_baseline(${literal(homeBaseline)})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importHomeBaseline();
  console.log("Local homepage Revision 1 present; existing history and pointers preserved.");
}
