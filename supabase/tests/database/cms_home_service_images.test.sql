begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
truncate cms_manual_campaign_events,cms_manual_campaign_placements,cms_manual_campaign_revisions,
  cms_promotion_schedule_audit,cms_promotion_schedule_attempts,cms_active_promotion_placements,cms_promotion_schedule_placements,cms_promotion_schedules,
  cms_page_route_events,cms_page_routes,cms_new_page_identity,cms_service_image_collections,page_revision_blocks,promotion_revision_media,cms_promotion_identity,
  media_audit_events,revision_media_refs,cms_media_upload_attempts,media_versions,media_assets,content_publication_events,content_publication_state,
  content_revisions,content_documents;
create temporary table image_fixture(p jsonb,baseline uuid,draft uuid);
grant select,update on image_fixture to authenticated;
insert into image_fixture(p) values ('{"schemaVersion":12,"publicTitle":"דף הבית","h1":"ניקיון מקצועי לבית, לעסק ולרכב","seoTitle":"CleanBrothers | ניקיון מקצועי לבית, לעסק ולרכב","seoDescription":"ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות לבית ולעסק. שירות מקצועי עד הלקוח באזור המרכז מבית CleanBrothers.","canonical":"/","blocks":[{"id":"d4000000-0000-4000-8000-000000000001","position":0,"type":"homeHero","schemaVersion":1,"hidden":false,"payload":{"eyebrow":"CleanBrothers • שירותי ניקיון מקצועיים","title":"ניקיון מקצועי לבית, לעסק ולרכב","description":"ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות — עם שירות מקצועי עד אליכם.","primaryLabel":"שלחו תמונה וקבלו הערכת מחיר","secondaryLabel":"צפו בכל השירותים","backgroundAlt":"ניקוי ספה מקצועי בבית הלקוח","trustChips":["לבית, לעסק ולרכב","שירות עד הבית","הערכת מחיר לפי תמונה"]},"mediaVersionId":"d3000000-0000-4000-8000-000000000002","promotionRevisionId":null},{"id":"d4000000-0000-4000-8000-000000000003","position":1,"type":"homeServices","schemaVersion":1,"hidden":false,"payload":{"eyebrow":"השירותים המרכזיים","title":"שירותי ניקיון מקצועיים לבית, לעסק ולרכב","mobileDescription":"ספות, מזרנים, שטיחים, רכבים, מזגנים וחלונות. שולחים תמונה ומקבלים הערכה.","description":"ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות. בוחרים את השירות המתאים, שולחים תמונה בוואטסאפ ומקבלים הערכת מחיר ברורה.","note":"בנוסף: ניקוי כורסאות, כיסאות וריפודים עדינים.","serviceKeys":["sofa-cleaning","mattress-cleaning"],"cards":{"sofa-cleaning":{"title":"ניקוי ספות","benefit":"מחזיר לספה מראה רענן ונעים בלי להחליף ריפוד.","description":"ניקוי עמוק לריפודי בד, הסרת לכלוך ורענון הספה בבית הלקוח.","images":[{"versionId":"76906e25-9adc-44a4-8ada-7851d1ba3b6c","alt":"ניקוי ספות, תמונה 1 מתוך 4","position":"object-[center_48%]"},{"versionId":"c228e26c-817b-4c17-82eb-8d61ebba1040","alt":"ניקוי ספות, תמונה 2 מתוך 4","position":"object-[58%_center]"},{"versionId":"f968f4a0-eec7-45dd-82d0-06828378c0ec","alt":"ניקוי ספות, תמונה 3 מתוך 4","position":"object-center"},{"versionId":"8c65dad3-abcf-4436-8315-e5474954ee65","alt":"ניקוי ספות, תמונה 4 מתוך 4","position":"object-[52%_center]"}]},"mattress-cleaning":{"title":"ניקוי מזרנים","benefit":"שינה נקייה יותר עם טיפול ממוקד בריחות וכתמים.","description":"טיפול יסודי באבק, ריחות וכתמים לשינה נקייה ונעימה יותר.","images":[{"versionId":"1733a278-1a4c-4230-860d-0db0e62cc57a","alt":"ניקוי מזרנים","position":"object-center"}]}}},"mediaVersionId":null,"promotionRevisionId":null}]}'::jsonb);
update image_fixture set baseline=cms_import_home_baseline(p);
select is((select count(*)::integer from revision_media_refs where usage_role like 'home-service:%'),20,'all ten shared collections pin immutable versions');
select ok(cms_valid_home_service_images('[]'),'empty gallery is valid');
select ok(not cms_valid_home_service_images('[{"versionId":"https://example.com/a.jpg","alt":"x","position":"object-center"}]'),'URL rejected');
select ok(not cms_valid_home_service_images('[{"versionId":"1733a278-1a4c-4230-860d-0db0e62cc57a","alt":"<script>","position":"object-center"}]'),'unsafe alt rejected');
select ok(not has_function_privilege('authenticated','cms_seed_home_service_images(jsonb)','execute'),'seed helper is operator-only');
select ok(not has_function_privilege('anon','cms_save_home_draft(bigint,uuid,jsonb,uuid)','execute'),'anonymous write remains denied');
select is(cms_seed_home_service_images('{"cards":{"sofa-cleaning":{"title":"editor","images":[]}}}')->'cards'->'sofa-cleaning'->'images','[]'::jsonb,'seed preserves explicit empty lists');
insert into auth.users(id,invited_at) values ('55000000-0000-4000-8000-000000000001',null);
insert into cms_admin_members(user_id,is_active) values ('55000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"55000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
-- Replace, add, remove and reorder a list. Shared images may appear in separate cards.
update image_fixture set p=jsonb_set(p,'{blocks,1,payload,cards,sofa-cleaning,images}',
 '[{"versionId":"1733a278-1a4c-4230-860d-0db0e62cc57a","alt":"תמונה ראשונה חדשה","position":"object-center"},
   {"versionId":"8c65dad3-abcf-4436-8315-e5474954ee65","alt":"תמונה שנייה","position":"object-[center_42%]"}]');
update image_fixture set draft=cms_save_home_draft(1,baseline,p);
select is(cms_read_home_editor()->'draft'->'blocks'->1->'payload'->'cards'->'sofa-cleaning'->'images',p->'blocks'->1->'payload'->'cards'->'sofa-cleaning'->'images','saved images, alts and order read back exactly') from image_fixture;
select is(cms_read_public_home()->>'revisionId',baseline::text,'draft does not change homepage') from image_fixture;
select is(cms_publish_home_revision(2,draft),draft,'publish saved images') from image_fixture;
select is(cms_read_public_home()->'payload'->'blocks'->1->'payload'->'cards'->'sofa-cleaning'->'images',p->'blocks'->1->'payload'->'cards'->'sofa-cleaning'->'images','published homepage follows saved list') from image_fixture;
select is((select count(*)::integer from jsonb_array_elements(cms_read_public_home()->'media') m where m->>'usage_role'='home-service:sofa-cleaning'),2,'published reader returns service media refs');
select is((select m->>'alt_text' from jsonb_array_elements(cms_read_public_home()->'media') m where m->>'usage_role'='home-service:sofa-cleaning' and m->>'position'='0'),'תמונה ראשונה חדשה','media refs preserve per-card alt');
update image_fixture set p=jsonb_set(p,'{blocks,1,payload,cards,sofa-cleaning,images}','[]');
update image_fixture set draft=cms_save_home_draft(3,draft,p);
select is(cms_read_home_editor()->'draft'->'blocks'->1->'payload'->'cards'->'sofa-cleaning'->'images','[]'::jsonb,'last image removal survives read');
select is(cms_publish_home_revision(4,draft),draft,'publish empty image list') from image_fixture;
select is((select count(*)::integer from jsonb_array_elements(cms_read_public_home()->'media') m where m->>'usage_role'='home-service:sofa-cleaning'),0,'removed images excluded from public refs');
reset role;
select throws_ok($$update revision_media_refs set alt_text='changed'$$,'55000',null,'media references remain immutable');
select * from finish();
rollback;
