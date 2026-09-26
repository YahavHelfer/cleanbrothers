begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select is(cms_import_site_baseline('settings','{"schemaVersion":9,"businessName":"CleanBrothers","phoneDisplay":"0559577731","email":"CleanBrothers.ISR@gmail.com","serviceAreas":["מרכז הארץ"],"structuredDescription":"תיאור עסק"}'::jsonb)::text,
  cms_import_site_baseline('settings','{"schemaVersion":9,"businessName":"Different","phoneDisplay":"0559577731","email":"x@example.com","serviceAreas":["מרכז הארץ"],"structuredDescription":"תיאור עסק"}'::jsonb)::text,
  'settings import is idempotent and does not overwrite');
select is(cms_import_site_baseline('navigation','{"schemaVersion":10,"items":[{"id":"a3000000-0000-4000-8000-000000000001","order":0,"label":"בית","visible":true,"target":{"kind":"static","path":"/"}}]}'::jsonb)::text,
  cms_import_site_baseline('navigation','{"schemaVersion":10,"items":[{"id":"a3000000-0000-4000-8000-000000000001","order":0,"label":"אחר","visible":true,"target":{"kind":"static","path":"/"}}]}'::jsonb)::text,
  'navigation import is idempotent');
select is(cms_import_site_baseline('footer','{"schemaVersion":11,"description":"תיאור","featuredServices":["sofa-cleaning"],"legal":[{"path":"/privacy-policy","order":0,"label":"פרטיות","visible":true},{"path":"/data-deletion","order":1,"label":"מחיקה","visible":true},{"path":"/accessibility-statement","order":2,"label":"נגישות","visible":true}],"copyright":"זכויות","tagline":"שורה","whatsappCtaLabel":"דברו איתנו"}'::jsonb)::text,
  cms_import_site_baseline('footer','{"schemaVersion":11,"description":"אחר","featuredServices":["sofa-cleaning"],"legal":[{"path":"/privacy-policy","order":0,"label":"פרטיות","visible":true},{"path":"/data-deletion","order":1,"label":"מחיקה","visible":true},{"path":"/accessibility-statement","order":2,"label":"נגישות","visible":true}],"copyright":"זכויות","tagline":"שורה","whatsappCtaLabel":"דברו איתנו"}'::jsonb)::text,
  'footer import is idempotent');
select is((select count(*)::int from content_documents where content_type='site'),3,'three stable site documents');
select is((select count(*)::int from content_revisions r join content_documents d on d.id=r.document_id where d.content_type='site'),3,'one immutable baseline revision each');
select ok(not cms_valid_site_payload('settings','{"schemaVersion":9,"businessName":"X","phoneDisplay":"0559577731","email":"x@example.com","serviceAreas":["מרכז"],"structuredDescription":"X","crmSecret":"unsafe"}'::jsonb),'integration field rejected');
select ok(not cms_valid_site_payload('settings','{"schemaVersion":9,"businessName":"X","phoneDisplay":"0500000000","email":"x@example.com","serviceAreas":["מרכז"],"structuredDescription":"X"}'::jsonb),'phone target cannot change');
select ok(not cms_site_target('{"kind":"static","path":"/admin"}'::jsonb),'admin target rejected');
select ok(not cms_site_target('{"kind":"static","path":"/api/whatsapp"}'::jsonb),'API target rejected');
select ok(not cms_site_target('{"kind":"static","path":"javascript:alert(1)"}'::jsonb),'script URL rejected');
select ok(not cms_site_target('{"kind":"static","path":"data:text/html,x"}'::jsonb),'data URL rejected');
select ok(not cms_site_target('{"kind":"page","id":"not-a-uuid"}'::jsonb),'broken document ID rejected');
select ok(not cms_valid_site_payload('navigation','{"schemaVersion":10,"items":[{"id":"a3000000-0000-4000-8000-000000000001","order":1,"label":"בית","visible":true,"target":{"kind":"static","path":"/"}}]}'::jsonb),'duplicate or noncontiguous ordering rejected');
select ok(not cms_valid_site_payload('navigation','{"schemaVersion":10,"items":[{"id":"a3000000-0000-4000-8000-000000000001","order":0,"label":"בית","visible":true,"target":{"kind":"static","path":"/"}},{"id":"a3000000-0000-4000-8000-000000000002","order":0,"label":"עוד","visible":true,"target":{"kind":"static","path":"/about"}}]}'::jsonb),'duplicate navigation order rejected');
select ok(not cms_valid_site_payload('settings','{"schemaVersion":9,"businessName":"X","phoneDisplay":"0559577731","email":"x@example.com","serviceAreas":["מרכז"],"structuredDescription":"X","logoMediaId":"a4000000-0000-4000-8000-000000000001"}'::jsonb),'arbitrary media reference rejected');
select ok(not cms_valid_site_payload('footer','{"schemaVersion":11,"description":"תיאור","featuredServices":["sofa-cleaning"],"legal":[{"path":"/privacy-policy","order":0,"label":"פרטיות","visible":true},{"path":"/data-deletion","order":1,"label":"מחיקה","visible":true},{"path":"/admin","order":2,"label":"נגישות","visible":true}],"copyright":"זכויות","tagline":"שורה","whatsappCtaLabel":"דברו"}'::jsonb),'unsafe legal route rejected');

insert into auth.users(id,invited_at) values
 ('54000000-0000-4000-8000-000000000001',null),
 ('54000000-0000-4000-8000-000000000002',null),
 ('54000000-0000-4000-8000-000000000003',null);
insert into cms_admin_members(user_id,is_active) values
 ('54000000-0000-4000-8000-000000000001',true),
 ('54000000-0000-4000-8000-000000000003',false);
set local role anon;
select throws_ok($$select cms_read_site_editor('settings')$$,'42501',null,'anonymous editor denied');
select is(cms_read_public_site('settings') ? 'history',false,'public projection has no history');
select is(cms_read_public_site('settings') ? 'draftRevisionId',false,'public projection has no draft pointer');
select is(cms_read_public_site('missing'),null::jsonb,'unknown public document denied');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_read_site_editor('settings')$$,'42501',null,'nonmember reader denied');
select throws_ok($$select cms_save_site_draft('settings',1,null,null)$$,'42501',null,'nonmember mutation denied');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$select cms_read_site_editor('settings')$$,'42501',null,'inactive member denied');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok($$select cms_read_site_editor('settings')$$,'42501',null,'AAL1 reader denied');
select throws_ok($$select cms_publish_site_revision('settings',1,null)$$,'42501',null,'AAL1 publish denied');
select set_config('request.jwt.claims','{"sub":"54000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok($$insert into content_documents(content_type,content_key) values('site','settings')$$,'42501',null,'direct write blocked');
select is((cms_read_site_editor('settings')->>'generation')::int,1,'settings starts at generation one');
select set_config('cms.test.settings.base',cms_read_site_editor('settings')->>'draftRevisionId',true);
select is(cms_read_site_revision('navigation',current_setting('cms.test.settings.base')::uuid),null::jsonb,
  'revision cannot cross document boundary');
select set_config('cms.test.settings.next',cms_save_site_draft('settings',1,current_setting('cms.test.settings.base')::uuid,
  jsonb_set(cms_read_site_editor('settings')->'draft','{businessName}','"בדיקה"'::jsonb))::text,true);
select is(cms_read_public_site('settings')->'payload'->>'businessName','CleanBrothers','draft does not leak publicly');
select throws_ok(format('select cms_save_site_draft(%L,1,%L,null)', 'settings',current_setting('cms.test.settings.base')),
  'PT409',null,'stale settings editor rejected');
select is((cms_read_site_editor('navigation')->>'generation')::int,1,'settings draft does not stale navigation');
select is((cms_read_site_editor('footer')->>'generation')::int,1,'settings draft does not stale footer');
select is(cms_publish_site_revision('settings',2,current_setting('cms.test.settings.next')::uuid)::text,
  current_setting('cms.test.settings.next'),'publish switches exact settings revision');
select is(cms_read_public_site('settings')->'payload'->>'businessName','בדיקה','published settings visible');
select set_config('cms.test.settings.restored',cms_save_site_draft('settings',3,current_setting('cms.test.settings.next')::uuid,
  null,current_setting('cms.test.settings.base')::uuid)::text,true);
select isnt(current_setting('cms.test.settings.restored'),current_setting('cms.test.settings.base'),'restore creates a new immutable revision');
select is(cms_read_public_site('settings')->'payload'->>'businessName','בדיקה','restore draft does not publish');
select cms_publish_site_revision('settings',4,current_setting('cms.test.settings.restored')::uuid);
select is(cms_read_public_site('settings')->'payload'->>'businessName','CleanBrothers','rollback restores baseline');
select is((select count(*)::int from content_revisions where document_id='c0000000-0000-4000-8000-000000000301'),3,
  'historical settings revisions remain immutable');

select set_config('cms.test.footer.base',cms_read_site_editor('footer')->>'draftRevisionId',true);
select set_config('cms.test.footer.next',cms_save_site_draft('footer',1,current_setting('cms.test.footer.base')::uuid,
  jsonb_set(cms_read_site_editor('footer')->'draft','{tagline}','"שורת בדיקה"'::jsonb))::text,true);
select is(cms_read_public_site('footer')->'payload'->>'tagline','שורה','footer draft does not leak publicly');
select throws_ok(format('select cms_save_site_draft(%L,1,%L,null)', 'footer',current_setting('cms.test.footer.base')),
  'PT409',null,'stale footer editor rejected');
select is(cms_publish_site_revision('footer',2,current_setting('cms.test.footer.next')::uuid)::text,
  current_setting('cms.test.footer.next'),'footer publishes exact saved revision');
select is(cms_read_public_site('footer')->'payload'->>'tagline','שורת בדיקה','published footer is public');
select set_config('cms.test.footer.restored',cms_save_site_draft('footer',3,current_setting('cms.test.footer.next')::uuid,
  null,current_setting('cms.test.footer.base')::uuid)::text,true);
select isnt(current_setting('cms.test.footer.restored'),current_setting('cms.test.footer.base'),
  'footer rollback creates a new revision');
select cms_publish_site_revision('footer',4,current_setting('cms.test.footer.restored')::uuid);
select is(cms_read_public_site('footer')->'payload'->>'tagline','שורה','footer rollback restores baseline');

select set_config('cms.test.page',cms_create_new_page('עמוד יעד','cms-site-target','blank')::text,true);
select set_config('cms.test.nav.base',cms_read_site_editor('navigation')->>'draftRevisionId',true);
select set_config('cms.test.nav.draft',cms_save_site_draft('navigation',1,current_setting('cms.test.nav.base')::uuid,
  jsonb_build_object('schemaVersion',10,'items',jsonb_build_array(jsonb_build_object(
    'id','a3000000-0000-4000-8000-000000000011','order',0,'label','עמוד יעד','visible',true,
    'target',jsonb_build_object('kind','page','id',current_setting('cms.test.page'))))))::text,true);
select is(cms_read_public_site('navigation')->'payload'->'items'->0->>'label','בית',
  'navigation draft does not leak publicly');
select throws_ok(format('select cms_save_site_draft(%L,1,%L,null)', 'navigation',current_setting('cms.test.nav.base')),
  'PT409',null,'stale navigation editor rejected');
select throws_ok(format('select cms_publish_site_revision(%L,2,%L)', 'navigation',current_setting('cms.test.nav.draft')),
  '22023',null,'cannot publish navigation to unpublished page');
select cms_publish_new_page(current_setting('cms.test.page')::uuid,1,
  (cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'draftRevisionId')::uuid);
select cms_publish_site_revision('navigation',2,current_setting('cms.test.nav.draft')::uuid);
select is(cms_read_public_site('navigation')->'pageRoutes'->>current_setting('cms.test.page'),
  'cms-site-target','published navigation resolves current route');
select throws_ok(format('select cms_unpublish_new_page(%L,2)',current_setting('cms.test.page')),
  '55000',null,'cannot unpublish page referenced by live navigation');
select set_config('cms.test.page.draft',cms_save_new_page_draft(current_setting('cms.test.page')::uuid,2,
  (cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->>'draftRevisionId')::uuid,
  jsonb_set(cms_read_new_page_editor(current_setting('cms.test.page')::uuid)->'draft','{canonical}',
    '"/cms-site-renamed"'::jsonb))::text,true);
select cms_publish_new_page(current_setting('cms.test.page')::uuid,3,current_setting('cms.test.page.draft')::uuid);
select is(cms_read_public_site('navigation')->'pageRoutes'->>current_setting('cms.test.page'),
  'cms-site-renamed','stable page reference follows slug change');
select set_config('cms.test.nav.hidden',cms_save_site_draft('navigation',3,current_setting('cms.test.nav.draft')::uuid,
  jsonb_set(cms_read_site_editor('navigation')->'draft','{items,0,visible}','false'::jsonb))::text,true);
select cms_publish_site_revision('navigation',4,current_setting('cms.test.nav.hidden')::uuid);
select cms_unpublish_new_page(current_setting('cms.test.page')::uuid,4);
select is(cms_resolve_new_page_route('cms-site-renamed'),null::jsonb,'page can be unpublished after navigation update');
select ok(not (cms_read_public_site('navigation') ?| array['createdBy','history','draft']),
  'public navigation reveals no editor or history');
select * from finish();
rollback;
