import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader } from "../tests/helpers/source-module.mjs";
export function importSpecialServices() {
 const load = createSourceLoader();
 const { specialStaticMediaInventory } = load("src/cms/media/special-static-inventory.ts");
 for (const image of specialStaticMediaInventory) {
  const bytes = readFileSync(`public${image.path}`);
  if (bytes.length !== image.byteSize || createHash("sha256").update(bytes).digest("hex") !== image.hash) throw new Error("Special static inventory changed");
 }
 const { acBaseline, windowBaseline } = load("src/cms/content/special-baseline.ts");
 const { validateSpecialContent } = load("src/cms/content/special-model.ts");
 const statements = [["air-conditioner-cleaning", acBaseline], ["window-cleaning", windowBaseline]].map(([key, content]) =>
  `select public.cms_import_shared_baseline('${key}', '${JSON.stringify(validateSpecialContent(key, content)).replaceAll("'", "''")}'::jsonb);`);
 localSql(`begin; select public.cms_import_special_media(); ${statements.join("\n")} commit;`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 importSpecialServices();
 console.log("Two special local baselines present; existing eight-service history preserved; no uploads.");
}
