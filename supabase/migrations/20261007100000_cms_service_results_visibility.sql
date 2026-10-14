begin;
create or replace function public.cms_valid_shared_payload(k text,p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; pair jsonb; name text; val jsonb; allowed text[]:=array['object-center','object-[center_48%]','object-[58%_center]','object-[52%_center]','object-[center_42%]'];
begin
 if public.cms_shared_service_id(k) is null or p is null then return false;end if;
 if p->'schemaVersion' is distinct from '3'::jsonb then return k='delicate-upholstery-cleaning' and public.cms_valid_pilot_payload(p);end if;
 if not public.cms_valid_pilot_payload((p-array['beforeAfter','imagePosition','imagePositions','pageCopy','resultsHidden'])||'{"schemaVersion":2,"relatedLinks":[]}'::jsonb) then return false;end if;
 if jsonb_typeof(p->'relatedLinks') is distinct from 'array' or jsonb_array_length(p->'relatedLinks')>6 then return false;end if;
 for item in select value from jsonb_array_elements(p->'relatedLinks') loop
   if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2 or not item ?& array['href','label'] or jsonb_typeof(item->'href')<>'string' or left(item->>'href',1)<>'/' or public.cms_shared_service_id(substr(item->>'href',2)) is null or jsonb_typeof(item->'label')<>'string' or char_length(btrim(item->>'label')) not between 1 and 120 or (item->>'label') ~ E'[<>\\x01-\\x1f\\x7f]' then return false;end if;
 end loop;
 if (select count(distinct value->>'href') from jsonb_array_elements(p->'relatedLinks'))<>jsonb_array_length(p->'relatedLinks') then return false;end if;
 if p ? 'imagePosition' and (jsonb_typeof(p->'imagePosition')<>'string' or not (p->>'imagePosition'=any(allowed))) then return false;end if;
 if p ? 'imagePositions' then
   if jsonb_typeof(p->'imagePositions')<>'object' or (select count(*) from jsonb_object_keys(p->'imagePositions'))>8 then return false;end if;
   for name,val in select * from jsonb_each(p->'imagePositions') loop
     if not (p->'images' ? name) or jsonb_typeof(val)<>'string' or not ((val#>>'{}')=any(allowed)) then return false;end if;
   end loop;
 end if;
 if p ? 'beforeAfter' then
   pair:=p->'beforeAfter';
   if jsonb_typeof(pair)<>'object' or (select count(*) from jsonb_object_keys(pair))<>6 or not pair ?& array['title','description','beforeImage','afterImage','beforeAlt','afterAlt'] then return false;end if;
   for name,val in select * from jsonb_each(pair) loop
     if jsonb_typeof(val)<>'string' or char_length(btrim(val#>>'{}')) not between 1 and (case name when 'title' then 180 when 'description' then 2000 else 300 end) or (val#>>'{}') ~ E'[<>\\x01-\\x1f\\x7f]' then return false;end if;
     if name in ('beforeImage','afterImage') and (val#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false;end if;
   end loop;
   if pair->>'beforeImage'=pair->>'afterImage' then return false;end if;
 end if;
 if p ? 'resultsHidden' and jsonb_typeof(p->'resultsHidden') <> 'boolean' then return false; end if;
 if p ? 'pageCopy' then
  pair:=p->'pageCopy';
  if jsonb_typeof(pair)<>'object' or (select count(*) from jsonb_object_keys(pair))<>16 or
    not pair ?& array['heroCta','whatsappCta','imageCaption','signsEyebrow','processEyebrow','benefitsTitle','resultEyebrow','resultTitle','resultHeading','resultNote','galleryCta','faqTitle','contactEyebrow','contactTitle','contactDescription','contactWhatsappCta'] then return false; end if;
  for name,val in select * from jsonb_each(pair) loop
   if not public.cms_page_plain(val,2000) then return false; end if;
  end loop;
 end if;
 return true;
exception when others then return false;end;$$;

create or replace function public.cms_attach_revision_media() returns trigger language plpgsql security definer set search_path='' as $$
declare vid uuid; idx integer; role_name text; alt text; cap text; a public.media_assets; items jsonb; item jsonb;
begin
 if new.source_revision_id is not null and exists(select 1 from public.revision_media_refs where revision_id=new.source_revision_id) then
   insert into public.revision_media_refs select new.id,media_version_id,usage_role,position,alt_text,caption from public.revision_media_refs where revision_id=new.source_revision_id;
   return new;
 end if;
 if new.schema_version in (4,5) then
  for role_name,items in select * from jsonb_each(new.body->'media') loop
   for item,idx in select value,(ordinality-1)::integer from jsonb_array_elements(items) with ordinality loop
    vid:=(item->>'versionId')::uuid;
    select m.* into a from public.media_assets m join public.media_versions v on v.asset_id=m.id where v.id=vid for share of m;
    if not found then raise exception using errcode='23503',message='Unknown media version';end if;
    if a.status='archived' and not exists(select 1 from public.revision_media_refs where revision_id=new.base_revision_id and media_version_id=vid) then raise exception using errcode='55000',message='CMS media archived';end if;
    insert into public.revision_media_refs values(new.id,vid,role_name,idx,item->>'alt',a.caption);
   end loop;
  end loop;
  return new;
 end if;
 for vid,idx in select case when new.schema_version=1 then 'd1000000-0000-4000-8000-000000000001'::uuid else value::uuid end,(ordinality-1)::integer from jsonb_array_elements_text(new.body->'images') with ordinality loop
   select m.* into a from public.media_assets m join public.media_versions v on v.asset_id=m.id where v.id=vid for share of m;
   if not found then
     if new.schema_version=1 then continue;end if;
     raise exception using errcode='23503',message='Unknown media version';
   end if;
   if a.status='archived' and new.schema_version>=2 and not exists(select 1 from public.revision_media_refs where revision_id=new.base_revision_id and media_version_id=vid) then raise exception using errcode='55000',message='CMS media archived';end if;
   cap:=a.caption;
   foreach role_name in array array['hero','benefits','result'] loop
     if role_name='result' and idx<>0 then continue;end if;
     alt:=case role_name when 'hero' then new.body->>'imageAlt' when 'benefits' then 'צילום של '||new.public_title||' על ידי CleanBrothers' else 'צילום מהשטח במהלך '||new.public_title end;
     insert into public.revision_media_refs values(new.id,vid,role_name,idx,alt,cap);
   end loop;
 end loop;
 if new.schema_version=3 and new.body ? 'beforeAfter' then
   foreach role_name in array array['before','after'] loop
     vid:=(new.body->'beforeAfter'->>(role_name||'Image'))::uuid;
     select m.* into a from public.media_assets m join public.media_versions v on v.asset_id=m.id where v.id=vid for share of m;
     if not found then raise exception using errcode='23503',message='Unknown media version';end if;
     if a.status='archived' and not exists(select 1 from public.revision_media_refs where revision_id=new.base_revision_id and media_version_id=vid) then raise exception using errcode='55000',message='CMS media archived';end if;
     insert into public.revision_media_refs values(new.id,vid,role_name,0,new.body->'beforeAfter'->>(role_name||'Alt'),a.caption);
   end loop;
 end if;
 return new;
end;$$;

-- A migration-only, contextual text transform. Customer/review copy is untouched.
create function public.cms_photo_copy_cleanup(p jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb; text_value text;
begin
 case jsonb_typeof(p)
 when 'object' then
  select coalesce(jsonb_object_agg(key,public.cms_photo_copy_cleanup(value)),'{}') into result from jsonb_each(p);
 when 'array' then
  select coalesce(jsonb_agg(public.cms_photo_copy_cleanup(value) order by ordinality),'[]') into result from jsonb_array_elements(p) with ordinality;
 when 'string' then
  text_value:=p#>>'{}';
  text_value:=replace(text_value,'עבודות ניקוי מזגנים אמיתיות','עבודות ניקוי מזגנים');
  text_value:=replace(text_value,'עבודת ניקוי מזגן אמיתית','עבודת ניקוי מזגן');
  text_value:=replace(text_value,'תוצאות אמיתיות, בלי פילטרים מיותרים','תוצאות לפני ואחרי ניקוי');
  text_value:=regexp_replace(text_value,'(תיעוד|תמונה|תמונות|צילום|צילומים|תוצאות|עבודה|עבודות|מזרן|שטיח ביתי|ספת בד|ריפודי רכב) (אמיתיות|אמיתיים|אמיתית|אמיתי)([^א-ת]|$)','\1\3','g');
  result:=to_jsonb(text_value);
 else result:=p;
 end case;
 return result;
end; $$;
revoke all on function public.cms_photo_copy_cleanup(jsonb) from public,anon,authenticated,service_role;

-- Append immutable successors for each affected current pointer independently.
-- Trigger changes are transaction-scoped and restored before COMMIT.
alter table public.content_revisions disable trigger content_revision_media;
alter table public.revision_media_refs disable trigger revision_media_scope;
alter table public.page_revision_blocks disable trigger page_promotion_media_scope;
alter table public.content_publication_state disable trigger publication_media_scope;
do $$
declare state public.content_publication_state; source public.content_revisions;
 old uuid; successor uuid; published uuid; draft uuid; next_number integer; audience integer; cleaned jsonb; changed boolean;
begin
 for state in select * from public.content_publication_state order by document_id for update loop
  published:=state.published_revision_id; draft:=state.draft_revision_id;
  for audience in 0..1 loop
   old:=case audience when 0 then state.published_revision_id else state.draft_revision_id end;
   if audience=1 and old=state.published_revision_id then draft:=published; continue; end if;
   select * into source from public.content_revisions where id=old;
   cleaned:=public.cms_photo_copy_cleanup(source.body);
   if source.document_id='78f7bdd5-5174-4d7b-8d5c-b0c1fd3a53c1' then
    cleaned:=cleaned||'{"resultsHidden":true}'::jsonb;
   end if;
   changed:=cleaned<>source.body or exists(select 1 from public.revision_media_refs where revision_id=old and
     (public.cms_photo_copy_cleanup(to_jsonb(alt_text))<>to_jsonb(alt_text) or public.cms_photo_copy_cleanup(to_jsonb(caption))<>to_jsonb(caption))) or
    exists(select 1 from public.page_revision_blocks where revision_id=old and public.cms_photo_copy_cleanup(payload)<>payload) or
    exists(select 1 from public.cms_service_image_collections where revision_id=old and public.cms_photo_copy_cleanup(images)<>images);
   if not changed then continue; end if;
   select max(revision_number)+1 into next_number from public.content_revisions where document_id=state.document_id;
   insert into public.content_revisions(document_id,revision_number,schema_version,public_title,h1,seo_title,seo_description,body,created_by,base_revision_id)
    values(source.document_id,next_number,source.schema_version,source.public_title,source.h1,source.seo_title,source.seo_description,cleaned,null,old) returning id into successor;
   -- Block/collection validators create their own references. Preserve any other
   -- references with exactly the same media identity/order and cleaned metadata.
   insert into public.page_revision_blocks(revision_id,block_id,position,block_type,schema_version,hidden,payload,media_version_id,promotion_revision_id)
    select successor,block_id,position,block_type,schema_version,hidden,public.cms_photo_copy_cleanup(payload),media_version_id,promotion_revision_id
    from public.page_revision_blocks where revision_id=old order by position;
   insert into public.cms_service_image_collections(revision_id,service_key,images)
    select successor,service_key,public.cms_photo_copy_cleanup(images) from public.cms_service_image_collections where revision_id=old;
   insert into public.revision_media_refs(revision_id,media_version_id,usage_role,position,alt_text,caption)
    select successor,media_version_id,usage_role,position,public.cms_photo_copy_cleanup(to_jsonb(alt_text))#>>'{}',public.cms_photo_copy_cleanup(to_jsonb(caption))#>>'{}'
    from public.revision_media_refs where revision_id=old on conflict do nothing;
   if audience=0 then published:=successor;
    insert into public.content_publication_events(document_id,revision_id,kind) values(state.document_id,successor,'baseline');
   else draft:=successor; end if;
  end loop;
  if published<>state.published_revision_id or draft<>state.draft_revision_id then
   update public.content_publication_state set published_revision_id=published,draft_revision_id=draft,generation=generation+1 where document_id=state.document_id;
   update public.content_documents set updated_at=now() where id=state.document_id;
  end if;
 end loop;
end; $$;
alter table public.content_revisions enable trigger content_revision_media;
alter table public.revision_media_refs enable trigger revision_media_scope;
alter table public.page_revision_blocks enable trigger page_promotion_media_scope;
alter table public.content_publication_state enable trigger publication_media_scope;
drop function public.cms_photo_copy_cleanup(jsonb);
commit;
