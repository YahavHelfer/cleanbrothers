import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader } from "../tests/helpers/source-module.mjs";

// The unlinked isolated local guard is mandatory; this command cannot target cloud.
export function importSharedServices() {
  const load = createSourceLoader();
  const { staticMediaInventory } = load("src/cms/media/static-inventory.ts");
  for (const image of staticMediaInventory) {
    const bytes = readFileSync(`public${image.path}`);
    if (bytes.length !== image.byteSize || createHash("sha256").update(bytes).digest("hex") !== image.hash) throw new Error("Static inventory changed");
  }
  const { sharedServiceKeys } = load("src/content/service-registry.ts");
  const { serviceBaseline } = load("src/cms/content/baseline.ts");
  const statements = sharedServiceKeys.map(key => `select public.cms_import_shared_baseline('${key}', '${JSON.stringify(serviceBaseline(key)).replaceAll("'", "''")}'::jsonb);`);
  // One operator transaction; existing documents/pointers/history are untouched.
  localSql(`begin; select public.cms_import_shared_media(); ${statements.join("\n")} commit;`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importSharedServices();
  console.log("Six local shared-service baselines present; existing history preserved; no media bytes copied.");
}
