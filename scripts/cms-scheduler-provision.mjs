import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const PROJECT_REF = "plbwefnwussxlglscfpn";
export const ROLE = "cms_scheduler";
export const JOB = "cms-promotion-scheduler";
export const CADENCE = "* * * * *";
export const COMMAND = "select public.cms_process_due_promotion_schedules(100);";
const FINGERPRINT = createHash("sha256").update(COMMAND).digest("hex");

// An operator supplies a connection only for an explicit invocation. Never
// accept a URL argument, log the URL, or pass a password on the command line.
export function connectionFromEnvironment(value) {
  if (!value) throw new Error("CMS_SCHEDULER_DATABASE_URL is required");
  let url;
  try { url = new URL(value); } catch { throw new Error("Invalid database URL"); }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") throw new Error("Expected PostgreSQL URL");
  const direct = url.hostname === `db.${PROJECT_REF}.supabase.co` && decodeURIComponent(url.username) === "postgres";
  const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) &&
    decodeURIComponent(url.username) === `postgres.${PROJECT_REF}`;
  if (!direct && !pooler) throw new Error("Connection is not bound to the approved CMS project");
  if (url.pathname !== "/postgres" || !url.password || url.search || url.hash)
    throw new Error("Expected the CMS postgres database and an operator connection");
  return { host: url.hostname, port: url.port || "5432", user: decodeURIComponent(url.username),
    database: "postgres", password: decodeURIComponent(url.password) };
}

function query(sql, connection) {
  try {
    return execFileSync("psql", ["-X", "-A", "-t", "-w", "-v", "ON_ERROR_STOP=1",
      "-h", connection.host, "-p", connection.port, "-U", connection.user, "-d", connection.database], {
      input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1024 * 1024,
      env: { ...process.env, PGPASSWORD: connection.password, PGSSLMODE: "require" },
    }).trim();
  } catch {
    // libpq errors can contain connection details; never relay stderr.
    throw new Error("Database operation failed; inspect privileged operator logs privately");
  }
}

export const stateSql = `select row_to_json(s)::text from (
  select exists(select 1 from pg_extension where extname='pg_cron') as cron_installed,
    (select extversion from pg_extension where extname='pg_cron') as cron_version,
    exists(select 1 from pg_roles where rolname='cms_scheduler') as role_exists,
    coalesce((select rolcanlogin and rolpassword is null and not rolsuper and not rolcreatedb
      and not rolcreaterole and not rolreplication and not rolbypassrls and not rolinherit
      from pg_authid where rolname='cms_scheduler'),false) as attributes_ok,
    (select json_build_object('login',rolcanlogin,'passwordNull',rolpassword is null,
      'superuser',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole,
      'replication',rolreplication,'bypassRls',rolbypassrls,'inherit',rolinherit)
      from pg_authid where rolname='cms_scheduler') as role_attributes,
    coalesce((select has_schema_privilege(oid,'public','USAGE') from pg_roles where rolname='cms_scheduler'),false) as public_usage,
    case when exists(select 1 from pg_namespace where nspname='cron') then
      coalesce((select has_schema_privilege(oid,'cron','USAGE') from pg_roles where rolname='cms_scheduler'),false)
      else false end as cron_usage,
    coalesce((select has_function_privilege(oid,'public.cms_process_due_promotion_schedules(integer)','EXECUTE')
      from pg_roles where rolname='cms_scheduler'),false) as wrapper_execute,
    coalesce((select has_function_privilege(oid,'public.cms_process_due_promotion_schedules_at(timestamptz,integer)','EXECUTE')
      from pg_roles where rolname='cms_scheduler'),false) as core_execute,
    (select count(*)::integer from pg_auth_members m join pg_roles r on r.oid=m.member
      where r.rolname='cms_scheduler') as inherited_memberships,
    (select count(*)::integer from pg_auth_members m join pg_roles r on r.oid=m.roleid
      where r.rolname='cms_scheduler' and m.set_option) as operator_set_memberships,
    (select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
      cross join pg_roles r where r.rolname='cms_scheduler' and n.nspname in ('public','auth','storage')
      and c.relkind in ('r','p','v','m','f') and
      has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) as direct_table_privileges,
    (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join pg_roles r where r.rolname='cms_scheduler' and n.nspname in ('public','auth','storage')
      and p.prosecdef and p.oid <> 'public.cms_process_due_promotion_schedules(integer)'::regprocedure
      and has_schema_privilege(r.oid,n.oid,'USAGE')
      and has_function_privilege(r.oid,p.oid,'EXECUTE')) as other_definer_functions,
    (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join pg_roles r where r.rolname='cms_scheduler' and n.nspname in ('public','auth','storage')
      and p.oid <> 'public.cms_process_due_promotion_schedules(integer)'::regprocedure
      and has_schema_privilege(r.oid,n.oid,'USAGE')
      and has_function_privilege(r.oid,p.oid,'EXECUTE')) as other_effective_functions
) s;`;

export const jobsSql = `select coalesce(json_agg(row_to_json(j)),'[]'::json)::text from (
  select jobid, jobname, schedule, command, username, database, active
  from cron.job where jobname='cms-promotion-scheduler' or username='cms_scheduler'
  order by jobid
) j;`;

export function assess(state, jobs) {
  if (!state.cron_installed) throw new Error("pg_cron prerequisite is absent");
  if (!state.role_exists) throw new Error("Apply the reviewed role migration first");
  for (const key of ["attributes_ok", "public_usage", "wrapper_execute"])
    if (state[key] !== true) throw new Error(`Scheduler role drift: ${key}`);
  for (const key of ["cron_usage", "core_execute"])
    if (state[key] !== false) throw new Error(`Scheduler role drift: ${key}`);
  for (const key of ["inherited_memberships", "operator_set_memberships", "direct_table_privileges", "other_definer_functions", "other_effective_functions"])
    if (state[key] !== 0) throw new Error(`Scheduler privilege drift: ${key}`);
  if (jobs.length > 1) throw new Error("Unexpected additional scheduler jobs");
  const job = jobs[0];
  if (job && (job.jobname !== JOB || job.schedule !== CADENCE || job.command !== COMMAND ||
    job.username !== ROLE || job.database !== "postgres" || job.active !== true))
    throw new Error("Existing scheduler job differs from the approved definition");
  return { jobExists: Boolean(job), jobId: job?.jobid ?? null };
}

function inspect(connection) {
  const state = JSON.parse(query(stateSql, connection));
  const jobs = state.cron_installed ? JSON.parse(query(jobsSql, connection)) : [];
  const jobId = jobs[0]?.jobid;
  if (jobId !== undefined && (!Number.isSafeInteger(jobId) || jobId < 1))
    throw new Error("Invalid cron job identifier");
  const latestRun = jobId === undefined ? null : JSON.parse(query(
    `select coalesce((select row_to_json(r) from (select status, start_time, end_time
      from cron.job_run_details where jobid=${jobId} order by runid desc limit 1) r),'null'::json)::text;`, connection));
  return { state, jobs, latestRun };
}

function transientRoleSql(operation, before, after) {
  return `begin;
    select pg_advisory_xact_lock(20260928,2);
    ${before}
    grant usage on schema cron to cms_scheduler;
    grant cms_scheduler to postgres with set true, inherit false;
    set role cms_scheduler;
    ${operation}
    reset role;
    ${after}
    revoke usage on schema cron from cms_scheduler;
    revoke cms_scheduler from postgres granted by postgres;
  commit;`;
}

export function plan(mode, jobId) {
  if (mode === "provision") return transientRoleSql(
    `select cron.schedule('${JOB}','${CADENCE}','${COMMAND}');`,
    `do $$ begin if exists(select 1 from cron.job where jobname='${JOB}' or username='${ROLE}')
      then raise exception 'scheduler job changed during provisioning'; end if; end $$;`,
    `do $$ begin if (select count(*) from cron.job where jobname='${JOB}'
      and schedule='${CADENCE}' and command='${COMMAND}' and username='${ROLE}'
      and database='postgres' and active) <> 1
      then raise exception 'scheduler job identity mismatch'; end if; end $$;`);
  if ((mode === "disable" || mode === "deprovision") && Number.isSafeInteger(jobId) && jobId > 0)
    return transientRoleSql(`select cron.unschedule(${jobId}::bigint);`,
      `do $$ begin if (select count(*) from cron.job where jobid=${jobId}
        and jobname='${JOB}' and schedule='${CADENCE}' and command='${COMMAND}'
        and username='${ROLE}' and database='postgres' and active) <> 1
        then raise exception 'scheduler job changed before disable'; end if; end $$;`,
      `do $$ begin if exists(select 1 from cron.job where jobid=${jobId})
        then raise exception 'scheduler job remains after disable'; end if; end $$;`);
  throw new Error("Unsupported operation or invalid job ID");
}

function publicStatus(state, jobs, latestRun = null) {
  const job = jobs[0];
  return { project: PROJECT_REF, pgCron: state.cron_installed ? state.cron_version : "absent",
    roleExists: state.role_exists, roleAttributesApproved: state.attributes_ok,
    roleAttributes: state.role_attributes,
    inheritedMemberships: state.inherited_memberships,
    operatorSetMemberships: state.operator_set_memberships,
    wrapperExecute: state.wrapper_execute, coreExecute: state.core_execute,
    directTablePrivileges: state.direct_table_privileges, otherDefinerFunctions: state.other_definer_functions,
    otherEffectiveFunctions: state.other_effective_functions,
    cronManagementUsage: state.cron_usage, jobExists: Boolean(job), jobName: job?.jobname ?? null,
    cadence: job?.schedule ?? null, commandFingerprint: job ? createHash("sha256").update(job.command).digest("hex") : null,
    approvedCommandFingerprint: FINGERPRINT, commandApproved: job?.command === COMMAND,
    executionIdentity: job?.username ?? null, active: job?.active ?? null,
    latestRun: latestRun && { status: latestRun.status, startTime: latestRun.start_time, endTime: latestRun.end_time } };
}

function main() {
  const [mode, projectRef, confirmation] = process.argv.slice(2);
  if (!["status", "provision", "disable", "deprovision"].includes(mode) || projectRef !== PROJECT_REF)
    throw new Error("Usage: node scripts/cms-scheduler-provision.mjs <status|provision|disable|deprovision> <approved-project-ref> [--confirm]");
  if (mode !== "status" && confirmation !== "--confirm") throw new Error("Mutation requires --confirm");
  const connection = connectionFromEnvironment(process.env.CMS_SCHEDULER_DATABASE_URL);
  const { state, jobs, latestRun } = inspect(connection);
  if (mode === "status") { process.stdout.write(`${JSON.stringify(publicStatus(state, jobs, latestRun), null, 2)}\n`); return; }
  const assessed = assess(state, jobs);
  if (mode === "provision" && !assessed.jobExists) query(plan(mode), connection);
  if ((mode === "disable" || mode === "deprovision") && assessed.jobExists)
    query(plan(mode, assessed.jobId), connection);
  if (mode === "deprovision") {
    const afterDisable = inspect(connection);
    if (afterDisable.jobs.length) throw new Error("Job still exists; role removal denied");
    query(`begin;
      revoke execute on function public.cms_process_due_promotion_schedules(integer) from cms_scheduler;
      revoke usage on schema public from cms_scheduler;
      drop role cms_scheduler;
      commit;`, connection);
  }
  const after = inspect(connection);
  if (mode === "deprovision") {
    if (after.state.role_exists || after.jobs.length) throw new Error("Deprovision verification failed");
  } else {
    const result = assess(after.state, after.jobs);
    if (mode === "provision" && !result.jobExists) throw new Error("Provision verification failed");
    if (mode === "disable" && result.jobExists) throw new Error("Disable verification failed");
  }
  process.stdout.write(`${JSON.stringify(publicStatus(after.state, after.jobs, after.latestRun), null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
