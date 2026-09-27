import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const load = createSourceLoader();
const { jerusalemLocalToUtc, utcToJerusalemLocal, validateScheduleTimes, validatePlacements,
  scheduleLabel, scheduleUuid, scheduleVersion } = load("src/cms/schedules/model.ts");

test("Jerusalem winter and summer times normalize deterministically to UTC", () => {
  assert.equal(jerusalemLocalToUtc("2026-01-10T10:30"), "2026-01-10T08:30:00.000Z");
  assert.equal(jerusalemLocalToUtc("2026-07-10T10:30"), "2026-07-10T07:30:00.000Z");
  assert.equal(utcToJerusalemLocal("2026-07-10T07:30:00.000Z"), "2026-07-10T10:30");
});
test("nonexistent and ambiguous Jerusalem DST wall times fail closed", () => {
  assert.throws(() => jerusalemLocalToUtc("2026-03-27T02:30"));
  assert.throws(() => jerusalemLocalToUtc("2026-10-25T01:30"));
  assert.equal(jerusalemLocalToUtc("2026-03-27T03:30"), "2026-03-27T00:30:00.000Z");
  assert.equal(jerusalemLocalToUtc("2026-10-25T02:30"), "2026-10-25T00:30:00.000Z");
});
test("malformed local times and non-increasing intervals fail closed", () => {
  for (const value of ["2026-02-30T10:00", "2026-01-01T24:00", "2026-01-01", "2030-01-01T10:00Z"])
    assert.throws(() => jerusalemLocalToUtc(value));
  assert.throws(() => validateScheduleTimes("2030-01-01T12:00", "2030-01-01T11:00"));
  assert.equal(validateScheduleTimes("2030-01-01T12:00", "").endsAt, null);
});
test("placements are typed, exact and unique", () => {
  assert.deepEqual(plain(validatePlacements([{ kind: "home", target: "home" }, { kind: "service", target: "sofa-cleaning" }])),
    [{ kind: "home", target: "home" }, { kind: "service", target: "sofa-cleaning" }]);
  for (const bad of [[], [{ kind: "global", target: "https://evil.example" }],
    [{ kind: "service", target: "fake-service" }], [{ kind: "home", target: "home", css: "red" }],
    [{ kind: "home", target: "home" }, { kind: "home", target: "home" }]])
    assert.throws(() => validatePlacements(bad));
});
test("schedule identity, concurrency token and label reject invalid browser input", () => {
  assert.throws(() => scheduleUuid("/admin"));
  assert.throws(() => scheduleVersion(0));
  assert.throws(() => scheduleVersion("1.5"));
  assert.throws(() => scheduleLabel("<script>"));
});
test("schedule gate accepts only local CMS or the approved project/branch/CMS Preview", () => {
  const repo = readFileSync("src/cms/schedules/repository.ts", "utf8");
  const sql = readFileSync("supabase/migrations/20260928000000_cms_scheduled_promotions.sql", "utf8");
  const allowed = env => createSourceLoader({ env })("src/cms/schedules/environment.ts").schedulesEnvironmentAllowed();
  const local = { CMS_SCHEDULE_LOCAL_ENABLED: "true", CMS_SUPABASE_URL: "http://127.0.0.1:56321" };
  const preview = { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_n7Mm1cepeKANL1jNcNjarNh9QR2A",
    VERCEL_GIT_COMMIT_REF: "feature/cms-cloud-foundation",
    CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" };
  assert.equal(allowed(local), true);
  assert.equal(allowed(preview), true);
  assert.equal(allowed({ ...preview, VERCEL_PROJECT_ID: "prj_other" }), false);
  assert.equal(allowed({ ...preview, VERCEL_GIT_COMMIT_REF: "main" }), false);
  assert.equal(allowed({ ...preview, CMS_SUPABASE_URL: "https://crm.supabase.co" }), false);
  assert.equal(allowed({ ...preview, CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co.evil.example" }), false);
  assert.equal(allowed({ ...preview, CMS_SUPABASE_URL: "https://evil.example/plbwefnwussxlglscfpn.supabase.co" }), false);
  assert.equal(allowed({ ...preview, CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co@evil.example" }), false);
  assert.equal(allowed({ ...preview, CMS_SUPABASE_URL: "not-a-url" }), false);
  assert.equal(allowed({ ...preview, VERCEL_ENV: "production" }), false);
  for (const key of ["VERCEL", "VERCEL_ENV", "VERCEL_PROJECT_ID", "VERCEL_GIT_COMMIT_REF", "CMS_SUPABASE_URL"]) {
    const incomplete = { ...preview };
    delete incomplete[key];
    assert.equal(allowed(incomplete), false, `missing ${key} must fail closed`);
  }
  assert.equal(allowed({ ...local, CMS_SUPABASE_URL: "https://plbwefnwussxlglscfpn.supabase.co" }), false);
  assert.equal(allowed({ ...local, CMS_SCHEDULE_LOCAL_ENABLED: "false" }), false);
  assert.equal(allowed({ ...local, VERCEL_ENV: "production" }), false);
  assert.match(repo, /requireCmsAdmin\(\)/);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /primary key \(placement_kind, target_key\)/i);
  assert.match(sql, /pg_advisory_xact_lock\(20260928,1\)/i);
  assert.match(sql, /grant execute on function public\.cms_process_due_promotion_schedules\(timestamptz,integer\) to service_role/i);
  assert.doesNotMatch(repo, /setInterval|window\.|localStorage/);
});
test("schedule form binds the selected revision to its document identity", () => {
  const manager = readFileSync("src/cms/schedules/ScheduleManager.tsx", "utf8");
  const actions = readFileSync("src/cms/schedules/actions.ts", "utf8");
  assert.match(manager, /name="promotionSelection"/);
  assert.match(manager, /item\.documentId}:\$\{item\.revisionId/);
  assert.match(actions, /promotionSelection\(form\)/);
  assert.doesNotMatch(manager, /name="documentId"/);
});
