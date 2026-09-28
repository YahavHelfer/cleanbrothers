import { pathToFileURL } from "node:url";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader } from "../tests/helpers/source-module.mjs";

// Local operator command only. getLocalStack rejects a linked/cloud project.
export function importSiteBaseline() {
  const baseline = createSourceLoader()("src/cms/site/baseline.ts");
  const documents = [
    ["settings", baseline.siteSettingsBaseline],
    ["navigation", baseline.siteNavigationBaseline],
    ["footer", baseline.siteFooterBaseline],
  ];
  const sql = documents.map(([kind, payload]) =>
    `select public.cms_import_site_baseline('${kind}','${JSON.stringify(payload).replaceAll("'", "''")}'::jsonb);`).join("\n");
  const ids = localSql(`begin; ${sql} commit;`).split("\n").filter(line => /^[a-f0-9-]{36}$/.test(line));
  if (ids.length !== 3) throw new Error("Local site baseline import failed");
  return ids;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importSiteBaseline();
  console.log("Three local site baselines present; existing revisions preserved.");
}
