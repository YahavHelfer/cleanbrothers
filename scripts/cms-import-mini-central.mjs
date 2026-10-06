import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createSourceLoader } from "../tests/helpers/source-module.mjs";
import { localSql } from "./cms-local.mjs";
export function importMiniCentral() {
  const load = createSourceLoader();
  const { serviceBaseline } = load("src/cms/content/baseline.ts");
  const { specialStaticMediaInventory } = load("src/cms/media/special-static-inventory.ts");
  for (const image of specialStaticMediaInventory) {
    const bytes = readFileSync(`public${image.path}`);
    if (bytes.length !== image.byteSize || createHash("sha256").update(bytes).digest("hex") !== image.hash)
      throw new Error("Special static inventory changed");
  }
  const payload = JSON.stringify(serviceBaseline("mini-central-air-conditioner-cleaning")).replaceAll("'", "''");
  return localSql(`begin; select public.cms_import_special_media(); select public.cms_import_shared_baseline('mini-central-air-conditioner-cleaning', '${payload}'::jsonb); commit;`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importMiniCentral();
  console.log("Mini-central service imported; existing revisions preserved.");
}
