import { pathToFileURL } from "node:url";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader } from "../tests/helpers/source-module.mjs";

function literal(value) { return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`; }

// This operator import uses only the unlinked, isolated local CMS project.
// Both SQL imports are idempotent and share one transaction.
export function importAboutBaseline() {
  const load = createSourceLoader();
  const { aboutBaseline, aboutPromotionBaseline } = load("src/cms/pages/baseline.ts");
  localSql(`begin;
    select public.cms_import_promotion_baseline(${literal(aboutPromotionBaseline)});
    select public.cms_import_about_baseline(${literal(aboutBaseline)});
    commit;`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importAboutBaseline();
  console.log("Local /about and promotion baselines present; prior revisions and pointers preserved.");
}
