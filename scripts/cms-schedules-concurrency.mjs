import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { getLocalStack, localSql } from "./cms-local.mjs";

// Dedicated local-only integration test. This script refuses to run over existing local
// CMS content, and always resets only the named local stack in its cleanup path.
getLocalStack();
const counts = localSql(`select (select count(*) from auth.users),
  (select count(*) from public.content_documents),
  (select count(*) from public.cms_promotion_schedules);`);
assert.equal(counts, "0|0|0", "Concurrent-worker fixture requires an empty isolated local CMS database");
const cli = resolve("node_modules/.bin/supabase");
function worker() {
  return new Promise((resolveWorker, rejectWorker) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_cleanbrothers-cms-local",
      "psql", "-U", "postgres", "-d", "postgres", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1",
      "-c", "select public.cms_process_due_promotion_schedules('2030-05-01T10:00:00Z',100);"],
    { stdio: ["ignore", "pipe", "pipe"] });
    let output = "", error = "";
    child.stdout.on("data", data => { output += data.toString(); });
    child.stderr.on("data", data => { error += data.toString(); });
    child.once("error", rejectWorker);
    child.once("exit", code => code === 0 ? resolveWorker(Number(output.trim())) : rejectWorker(new Error(error.trim())));
  });
}
try {
  const payload = JSON.stringify({ schemaVersion: 7, publicTitle: "מבצע עומס", h1: "מבצע עומס",
    seoTitle: "מבצע עומס", seoDescription: "בדיקה", description: "בדיקת עובדים במקביל",
    template: "accent", enabled: true, cta: { label: "צרו קשר", target: { kind: "internal", path: "/contact" } },
    mediaVersionId: null, mediaAlt: null });
  localSql(`insert into auth.users(id,invited_at) values ('57000000-0000-4000-8000-000000000001',null);
    select public.cms_import_promotion_baseline('${payload}'::jsonb);`);
  const fixture = localSql(`with p as (
      select d.id doc_id,r.id rev_id,r.revision_number from public.content_documents d
      join public.content_revisions r on r.document_id=d.id
      where d.content_type='promotion' and d.content_key='about-intro'
    ), s as (
      insert into public.cms_promotion_schedules(promotion_document_id,promotion_revision_id,
        promotion_revision_number,label,starts_at,ends_at,status,created_by)
      select doc_id,rev_id,revision_number,'two workers','2030-05-01T10:00:00Z',
        '2030-05-01T11:00:00Z','scheduled','57000000-0000-4000-8000-000000000001' from p
      returning id
    ) insert into public.cms_promotion_schedule_placements(schedule_id,placement_kind,target_key)
      select id,'global','site' from s returning schedule_id;`);
  assert.match(fixture.split("\n")[0], /^[0-9a-f-]{36}$/);
  const results = await Promise.all([worker(), worker()]);
  assert.deepEqual(results.sort(), [0, 1], "Only one worker may logically activate");
  assert.equal(localSql(`select (select count(*) from public.cms_active_promotion_placements),
    (select count(*) from public.cms_promotion_schedule_attempts where action='activate'),
    (select count(*) from public.cms_promotion_schedule_audit where event_kind='activate');`), "1|1|1");
  assert.equal(localSql(`select status from public.cms_promotion_schedules limit 1;`), "active");
  console.log("Concurrent local workers: one activation, one active placement, one attempt and audit event");
} finally {
  execFileSync(cli, ["db", "reset", "--local", "--no-seed", "--network-id", "cleanbrothers-cms-local"], {
    stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1", DO_NOT_TRACK: "1" },
  });
  assert.equal(localSql(`select (select count(*) from auth.users),
    (select count(*) from public.content_documents),
    (select count(*) from public.cms_promotion_schedules);`), "0|0|0");
}
