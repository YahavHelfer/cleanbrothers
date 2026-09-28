-- Extend only the closed Homepage block vocabulary. Review content remains
-- external runtime data; immutable revisions contain presentation fields only.
begin;

create or replace function public.cms_valid_home_block(kind text,p jsonb,media_id uuid,promotion_id uuid)
returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; k text; n integer;
begin
  if kind in ('richText','imageText','promotionBanner','spacer') then
    return public.cms_valid_page_block(kind,p,media_id,promotion_id);
  end if;
  if promotion_id is not null or (kind='homeHero' and media_id is null) or
    (kind<>'homeHero' and media_id is not null) then return false; end if;
  if kind='homeHero' then
    return public.cms_page_keys(p,array['eyebrow','title','description','primaryLabel','secondaryLabel','trustChips','backgroundAlt']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description','primaryLabel','secondaryLabel','backgroundAlt']) and
      public.cms_home_strings(p->'trustChips',1,6);
  elsif kind in ('homeTrust','homeWhyUs') then
    if kind='homeTrust' then
      return public.cms_page_keys(p,array['items']) and public.cms_home_strings(p->'items',1,8);
    end if;
    return public.cms_page_keys(p,array['eyebrow','title','description','items']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description']) and public.cms_home_strings(p->'items',1,8);
  elsif kind='homeServices' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','serviceKeys','cards','note']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description','note']) or
      jsonb_typeof(p->'serviceKeys')<>'array' or jsonb_array_length(p->'serviceKeys') not between 1 and 8 or
      jsonb_typeof(p->'cards')<>'object' or (select count(*) from jsonb_object_keys(p->'cards'))>8 then return false; end if;
    if (select count(distinct value) from jsonb_array_elements_text(p->'serviceKeys'))<>jsonb_array_length(p->'serviceKeys') then return false; end if;
    for item in select value from jsonb_array_elements(p->'serviceKeys') loop
      k:=item#>>'{}';
      if k not in ('sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning') or
        not (p->'cards' ? k) then return false; end if;
    end loop;
    for k,item in select key,value from jsonb_each(p->'cards') loop
      if k not in ('sofa-cleaning','mattress-cleaning','carpet-cleaning','car-upholstery-cleaning',
        'armchair-chair-cleaning','delicate-upholstery-cleaning','air-conditioner-cleaning','window-cleaning','post-renovation-cleaning') or
        not public.cms_page_keys(item,array['title','benefit','description']) or
        not public.cms_home_text_fields(item,array['title','benefit','description']) then return false; end if;
    end loop;
    return true;
  elsif kind='homeProcess' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','steps']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description']) or
      jsonb_typeof(p->'steps')<>'array' or jsonb_array_length(p->'steps') not between 1 and 6 then return false; end if;
    for item in select value from jsonb_array_elements(p->'steps') loop
      if not public.cms_page_keys(item,array['title','description','mobileDescription','icon']) or
        not public.cms_home_text_fields(item,array['title','description','mobileDescription']) or
        item->>'icon' not in ('image','quote','calendar','cleaning') then return false; end if;
    end loop;
    return true;
  elsif kind='homeBeforeAfter' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','items','ctaLabel']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description','ctaLabel']) or
      jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 8 then return false; end if;
    for item in select value from jsonb_array_elements(p->'items') loop
      if not public.cms_page_keys(item,array['title','category','description','beforeVersionId','afterVersionId','beforeAlt','afterAlt']) or
        not public.cms_home_text_fields(item,array['title','description','beforeAlt','afterAlt']) or
        item->>'category' not in ('sofas','mattresses','carpets','cars') or
        item->>'beforeVersionId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
        item->>'afterVersionId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
        item->>'beforeVersionId'=item->>'afterVersionId' then return false; end if;
    end loop;
    return (select count(distinct value->>'title') from jsonb_array_elements(p->'items'))=jsonb_array_length(p->'items');
  elsif kind='homeGoogleReviews' then
    return public.cms_page_keys(p,array['eyebrow','title','description','showRatingSummary']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description']) and
      jsonb_typeof(p->'showRatingSummary')='boolean';
  elsif kind='homePricing' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','factorsHeading','factors','cards','ctaLabel','ctaNote']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description','factorsHeading','ctaLabel','ctaNote']) or
      not public.cms_home_strings(p->'factors',1,10) or jsonb_typeof(p->'cards')<>'array' or
      jsonb_array_length(p->'cards') not between 1 and 8 then return false; end if;
    for item in select value from jsonb_array_elements(p->'cards') loop
      if not public.cms_page_keys(item,array['title','description','icon']) or
        not public.cms_home_text_fields(item,array['title','description']) or
        item->>'icon' not in ('single','multi','car','air') then return false; end if;
    end loop;
    return true;
  elsif kind in ('homeEstimate','homeAreas') then
    return public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description']) and
      public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description']);
  elsif kind='homeFaq' then
    if not public.cms_page_keys(p,array['eyebrow','title','mobileDescription','description','items']) or
      not public.cms_home_text_fields(p,array['eyebrow','title','mobileDescription','description']) or
      jsonb_typeof(p->'items')<>'array' or jsonb_array_length(p->'items') not between 1 and 20 then return false; end if;
    for item in select value from jsonb_array_elements(p->'items') loop
      if not public.cms_page_keys(item,array['question','answer']) or
        not public.cms_home_text_fields(item,array['question','answer']) then return false; end if;
    end loop;
    return (select count(distinct value->>'question') from jsonb_array_elements(p->'items'))=jsonb_array_length(p->'items');
  elsif kind='homeFinalCta' then
    return public.cms_page_keys(p,array['eyebrow','title','description','whatsappLabel','phoneLabel','trustNotes']) and
      public.cms_home_text_fields(p,array['eyebrow','title','description','whatsappLabel','phoneLabel']) and
      public.cms_home_strings(p->'trustNotes',1,6);
  end if;
  return false;
exception when others then return false;
end; $$;

alter table public.page_revision_blocks drop constraint page_revision_blocks_block_type_check;
alter table public.page_revision_blocks add constraint page_revision_blocks_block_type_check check(block_type in
  ('hero','richText','imageText','faq','cta','promotionBanner','spacer','aboutOverview',
   'homeHero','homeTrust','homeServices','homeProcess','homeBeforeAfter','homeWhyUs',
   'homeGoogleReviews','homePricing','homeEstimate','homeAreas','homeFaq','homeFinalCta'));

commit;
