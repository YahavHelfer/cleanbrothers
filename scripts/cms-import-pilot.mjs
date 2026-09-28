import { importPilotMedia } from "./cms-import-media.mjs";
import { pathToFileURL } from "node:url";
import { localSql } from "./cms-local.mjs";
import { createSourceLoader } from "../tests/helpers/source-module.mjs";

// Deliberately local operator command, using the unlinked isolated stack guard.
// No cloud URL, token, service key or content value is printed.
export function importPilotBaseline() {
  importPilotMedia();
  const payload = createSourceLoader()("src/cms/content/baseline.ts").pilotBaseline();
  const literal = JSON.stringify(payload).replaceAll("'", "''");
  const id = localSql(`select public.cms_import_service_baseline('${literal}'::jsonb)`);
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Local pilot import failed");
  return id;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importPilotBaseline();
  console.log("Local pilot baseline present; existing revisions preserved.");
}
