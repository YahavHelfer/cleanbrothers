// Integration runner invoked only by the isolated Playwright suite.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import sharp from "sharp";
import {createSourceLoader} from "./source-module.mjs";
import {getLocalStack,localSql} from "../../scripts/cms-local.mjs";
const stack=getLocalStack(); // Exact unlinked local project; never cloud.
const input=JSON.parse(readFileSync(0,"utf8"));
assert.match(input.actor,/^[0-9a-f-]{36}$/);assert.match(input.baseline,/^[0-9a-f-]{36}$/);
const options={auth:{persistSession:false,autoRefreshToken:false}};
const trusted=createClient(stack.url,stack.serviceKey,options),actor=createClient(stack.url,stack.key,options);
const bucket="cms-media-preview";
let version,created=false,stage="local authentication";
try {
  assert.equal((await actor.auth.setSession(input.session)).error,null);
  stage="private bucket creation";
  assert.equal((await trusted.storage.createBucket(bucket,{public:false,fileSizeLimit:8388608,allowedMimeTypes:["image/webp"]})).error,null);created=true;
  const load=createSourceLoader({env:{
    CMS_SUPABASE_URL:"https://plbwefnwussxlglscfpn.supabase.co",CMS_SUPABASE_PUBLISHABLE_KEY:stack.key,CMS_MEDIA_SERVER_KEY:stack.serviceKey,
    CMS_MEDIA_PREVIEW_ENABLED:"1",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"feature/cms-cloud-foundation",
    CMS_PILOT_CONTENT_SOURCE:"published",CMS_CONTENT_SERVICE_ALLOWLIST:"delicate-upholstery-cleaning",
  },mocks:{"@/cms/server":{createCmsServerClient:async()=>actor},"./server":{createCmsServerClient:async()=>actor}},fetchImpl:async(url,init)=>{
    const u=new URL(url);assert.equal(u.origin,"https://plbwefnwussxlglscfpn.supabase.co");assert.match(u.pathname,/^\/(storage|rest)\/v1\//);
    // Production adapter, real local Storage/PostgREST: no external request possible.
    return fetch(stack.url+u.pathname+u.search,init);
  }});
  const state=()=>JSON.parse(localSql("select row_to_json(s) from content_publication_state s"));
  const payload=id=>{assert.match(id,/^[0-9a-f-]{36}$/);return JSON.parse(localSql(`select cms_revision_payload(r) from content_revisions r where id='${id}'`));};
  stage="AAL2 server upload and registration";
  const repo=load("src/cms/media/repository.ts");
  const bytes=await sharp({create:{width:24,height:16,channels:3,background:"orange"}}).png().toBuffer();
  const asset=await repo.uploadMedia(bytes,"fixture.png","image/png",{altText:"Cloud fixture",caption:"",folder:""});assert.match(asset,/^[0-9a-f-]{36}$/);
  version=localSql(`select current_version_id from media_assets where id='${asset}'`);assert.match(version,/^[0-9a-f-]{36}$/);
  const record=JSON.parse(localSql(`select row_to_json(v) from media_versions v where id='${version}'`));
  assert.equal(record.storage_provider,"supabase");assert.equal(record.storage_bucket,bucket);assert.equal(record.storage_path,version+".webp");assert.equal(record.created_by,input.actor);
  stage="authenticated proxy and integrity";
  const file=await repo.readPrivateMedia(version);assert.equal(createHash("sha256").update(file.bytes).digest("hex"),record.content_hash);
  const metadata=await sharp(file.bytes).metadata();assert.equal(metadata.format,"webp");assert.equal(metadata.exif,undefined);
  stage="direct Storage denial";
  const anonymous=createClient(stack.url,stack.key,options);
  assert.equal((await anonymous.storage.from(bucket).download(record.storage_path)).data,null);
  assert.equal(((await anonymous.storage.from(bucket).list()).data??[]).length,0);
  assert.ok((await actor.storage.from(bucket).upload("forbidden.webp",file.bytes,{contentType:"image/webp"})).error);
  const route=load("src/app/cms-media/[id]/route.ts");
  const request=()=>route.GET(new Request("http://127.0.0.1:56301/cms-media/"+version),{params:Promise.resolve({id:version})});
  stage="draft isolation";assert.equal((await request()).status,404);
  const s=state();const draft=await actor.rpc("cms_save_service_draft",{expected_generation:s.generation,base_revision:s.draft_revision_id,payload:{...payload(input.baseline),schemaVersion:2,images:[version]}});
  assert.equal(draft.error,null);assert.equal((await request()).status,404);
  stage="publication and media proxy";
  assert.equal((await actor.rpc("cms_publish_service_revision",{expected_generation:state().generation,revision:draft.data})).error,null);
  const response=await request();assert.equal(response.status,200);assert.match(response.headers.get("cache-control"),/no-store/);assert.match(response.headers.get("x-robots-tag"),/noindex/);
  assert.equal(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex"),record.content_hash);
  assert.equal(localSql(`select count(*) from revision_media_refs where revision_id='${input.baseline}' and media_version_id='${version}'`),"0");
  stage="archive and rollback";await repo.updateMedia(asset,1,"archive",null);assert.equal((await request()).status,200);
  const s2=state();const restored=await actor.rpc("cms_save_service_draft",{expected_generation:s2.generation,base_revision:s2.draft_revision_id,payload:null,restore_revision:input.baseline});assert.equal(restored.error,null);
  assert.equal((await actor.rpc("cms_publish_service_revision",{expected_generation:state().generation,revision:restored.data})).error,null);
  assert.deepEqual(payload(state().published_revision_id),payload(input.baseline));assert.equal(localSql(`select count(*) from revision_media_refs where media_version_id='${version}'`),"3");
  assert.equal((await trusted.storage.from(bucket).download(record.storage_path)).error,null);
} catch {
  // No SDK payloads, session credentials or raw errors in test artifacts.
  console.error("Local Storage integration failed at: "+stage);process.exitCode=1;
} finally {
  if(created) {
    // Dedicated disposable local fixture bucket only, including failed-upload orphans.
    const {data,error}=await trusted.storage.from(bucket).list();assert.equal(error,null);
    for(const object of data??[]) assert.match(object.name,/^[0-9a-f-]{36}\.webp$/);
    if(data?.length)assert.equal((await trusted.storage.from(bucket).remove(data.map(x=>x.name))).error,null);
    assert.equal((await trusted.storage.deleteBucket(bucket)).error,null);
  }
}
if(!process.exitCode)console.log("Local Preview Storage adapter integration passed; bucket and objects removed.");
