begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

create temporary table campaign_fixture (doc uuid, draft uuid, active_rev uuid,
  global_doc uuid, global_rev uuid, overlap_doc uuid, overlap_rev uuid, payload jsonb);
grant select,update on campaign_fixture to authenticated;
grant select on campaign_fixture to anon;
insert into campaign_fixture(payload) values (
  '{"schemaVersion":13,"publicTitle":"מבצע בדיקה","h1":"מבצע בדיקה","seoTitle":"מבצע בדיקה",
    "seoDescription":"תיאור","description":"תוכן המבצע","enabled":true,"displayMode":"popup",
    "badgeText":"מבצע","showPrice":false,"currentPrice":null,"oldPrice":null,"currency":"ILS",
    "benefitText":null,"cta":{"label":"צרו קשר","target":{"kind":"internal","path":"/contact"}},
    "terms":"לפי התנאים","delaySeconds":2,"frequency":"session","placements":["home:home"]}'::jsonb);
select ok(cms_valid_campaign_payload(payload),'typed campaign accepted') from campaign_fixture;
select ok(not cms_valid_campaign_payload(payload||'{"extra":"script"}'::jsonb),'unknown field rejected') from campaign_fixture;
select ok(not cms_valid_campaign_payload(jsonb_set(payload,'{h1}','"<script>"')),'HTML rejected') from campaign_fixture;
select ok(not cms_valid_campaign_payload(jsonb_set(payload,'{placements}','["service:* "]')),'wildcard rejected') from campaign_fixture;
select ok(not cms_valid_campaign_payload(jsonb_set(payload,'{placements}','["home:home","home:home"]')),'duplicate placement rejected') from campaign_fixture;
select ok(not cms_valid_campaign_payload(jsonb_set(payload,'{delaySeconds}','16')),'delay above 15 rejected') from campaign_fixture;
select ok(not cms_valid_campaign_payload(jsonb_set(payload,'{cta}','{"label":"Go","target":{"kind":"internal","path":"https://evil.example"}}')),
  'raw external CTA rejected') from campaign_fixture;
select is((select count(*)::int from pg_class where relname in
  ('cms_manual_campaign_revisions','cms_manual_campaign_placements','cms_manual_campaign_events') and relforcerowsecurity),3,
  'all manual campaign tables force RLS');
select ok(not has_function_privilege('anon','public.cms_create_manual_campaign(jsonb)','execute'),
  'anonymous cannot create campaign');
select ok(not has_function_privilege('service_role','public.cms_activate_manual_campaign(uuid,bigint,uuid)','execute'),
  'service role cannot activate campaign');

insert into auth.users(id,invited_at) values
  ('73000000-0000-4000-8000-000000000001',null),
  ('73000000-0000-4000-8000-000000000002',null);
insert into cms_admin_members(user_id,is_active) values
  ('73000000-0000-4000-8000-000000000001',true);
set local role anon;
select throws_ok($$select * from cms_manual_campaign_revisions$$,'42501',null,'anonymous cannot enumerate campaign content');
select throws_ok($$select * from cms_manual_campaign_placements$$,'42501',null,'anonymous cannot enumerate active slots');
select is(cms_read_public_manual_campaign('/'),null::jsonb,'no campaign shown initially');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_create_manual_campaign((select payload from campaign_fixture))$$,'42501',null,
  'authenticated nonmember cannot create');
select set_config('request.jwt.claims','{"sub":"73000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select cms_create_manual_campaign((select payload from campaign_fixture))$$,'42501',null,
  'password-only member cannot create');
select set_config('request.jwt.claims','{"sub":"73000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update campaign_fixture set doc=cms_create_manual_campaign(payload);
update campaign_fixture set draft=(cms_read_manual_campaign_editor(doc)->>'draftRevisionId')::uuid;
select is(jsonb_array_length(cms_read_manual_campaigns()),1,'admin sees one draft campaign');
select is(cms_read_public_manual_campaign('/'),null::jsonb,'unpublished initial revision stays private');
select is(cms_read_public_manual_campaign('/'),null::jsonb,'new campaign has no active public slot');
select throws_ok($$update cms_manual_campaign_revisions set campaign_config='{}'$$,'42501',null,
  'browser cannot mutate revision companion');
update campaign_fixture set active_rev=cms_save_manual_campaign_draft(doc,1,draft,
  jsonb_set(payload,'{description}','"טיוטה שנייה"'));
select is(cms_read_public_manual_campaign('/'),null::jsonb,'saved draft does not publish');
select is((select count(*)::int from content_revisions where document_id=(select doc from campaign_fixture)),2,
  'saving creates a second immutable revision');
select throws_ok($$select cms_save_manual_campaign_draft((select doc from campaign_fixture),1,
  (select draft from campaign_fixture),(select payload from campaign_fixture))$$,'PT409',null,
  'stale editor rejected');
select is(cms_activate_manual_campaign(doc,2,active_rev),active_rev,'explicit activation publishes saved revision') from campaign_fixture;
reset role;
set local role anon;
select is(cms_read_public_manual_campaign('/')->>'revisionId',(select active_rev::text from campaign_fixture),
  'home resolves exact published revision');
select is(cms_read_public_manual_campaign('/about'),null::jsonb,'home campaign does not bleed to about');
select is(cms_read_public_manual_campaign((select active_rev::text from campaign_fixture)),null::jsonb,
  'public reader cannot select revision UUID');
select ok(not (cms_read_public_manual_campaign('/') ?| array['documentId','history','generation','actorId']),
  'public projection omits management data');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update campaign_fixture set global_doc=cms_create_manual_campaign(jsonb_set(payload,'{placements}','["global:site"]'));
update campaign_fixture set global_rev=(cms_read_manual_campaign_editor(global_doc)->>'draftRevisionId')::uuid;
select is(cms_activate_manual_campaign(global_doc,1,global_rev),global_rev,'global placement can coexist with page-specific') from campaign_fixture;
reset role;
set local role anon;
select is(cms_read_public_manual_campaign('/')->>'revisionId',(select active_rev::text from campaign_fixture),
  'page-specific campaign wins global');
select is(cms_read_public_manual_campaign('/about')->>'revisionId',(select global_rev::text from campaign_fixture),
  'global campaign covers another approved page');
select is(cms_read_public_manual_campaign('/contact')->>'revisionId',(select global_rev::text from campaign_fixture),
  'global campaign covers contact');
select is(cms_read_public_manual_campaign('/privacy-policy')->>'revisionId',(select global_rev::text from campaign_fixture),
  'global campaign covers privacy policy');
select is(cms_read_public_manual_campaign('/accessibility-statement')->>'revisionId',(select global_rev::text from campaign_fixture),
  'global campaign covers accessibility statement');
select is(cms_read_public_manual_campaign('/data-deletion')->>'revisionId',(select global_rev::text from campaign_fixture),
  'global campaign covers data deletion');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
update campaign_fixture set overlap_doc=cms_create_manual_campaign(payload);
update campaign_fixture set overlap_rev=(cms_read_manual_campaign_editor(overlap_doc)->>'draftRevisionId')::uuid;
select throws_ok($$select cms_activate_manual_campaign((select overlap_doc from campaign_fixture),1,
  (select overlap_rev from campaign_fixture))$$,'23505',null,
  'second manual campaign cannot take an occupied exact slot');
select cms_disable_manual_campaign(doc,3) from campaign_fixture;
reset role;
set local role anon;
select is(cms_read_public_manual_campaign('/')->>'revisionId',(select global_rev::text from campaign_fixture),
  'disabling page-specific immediately reveals global fallback');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"73000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select cms_disable_manual_campaign(global_doc,2) from campaign_fixture;
reset role;
set local role anon;
select is(cms_read_public_manual_campaign('/'),null::jsonb,'disable immediately removes public campaign');
reset role;
select is((select count(*)::int from cms_manual_campaign_events),4,'activation/disable actions are audited');
select is((select count(*)::int from cms_promotion_schedules),0,'existing scheduler history remains untouched');
with inserted as (insert into cms_promotion_schedules(promotion_document_id,promotion_revision_id,
  promotion_revision_number,label,starts_at,ends_at,status,created_by)
  select global_doc,global_rev,1,'scheduled manual campaign',now()-interval '1 minute',now()+interval '1 hour',
    'active','73000000-0000-4000-8000-000000000001'::uuid from campaign_fixture returning id)
insert into cms_promotion_schedule_placements(schedule_id,placement_kind,target_key)
  select id,'global','site' from inserted;
insert into cms_active_promotion_placements(placement_kind,target_key,schedule_id,promotion_revision_id,activated_at)
  select 'global','site',s.id,s.promotion_revision_id,now() from cms_promotion_schedules s
  where s.label='scheduled manual campaign';
set local role anon;
select is(cms_read_active_promotion_placement('global','site'),null::jsonb,
  'new campaign is not duplicated as an old scheduled inline banner');
select is(cms_read_public_manual_campaign('/about')->>'revisionId',(select global_rev::text from campaign_fixture),
  'existing scheduler can activate exact new campaign revision');
reset role;
select * from finish();
rollback;
