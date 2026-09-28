begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"מה אומרים","title":"ביקורות","description":"דוגמה","showRatingSummary":true}',null,null),
  'typed presentation-only review block is accepted');
select ok(not cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"מה אומרים","title":"ביקורות","description":"דוגמה","showRatingSummary":"true"}',null,null),
  'rating summary requires a boolean');
select ok(not cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"מה אומרים","title":"ביקורות","description":"דוגמה","showRatingSummary":true,"apiKey":"secret"}',null,null),
  'Google key cannot enter a revision');
select ok(not cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"מה אומרים","title":"ביקורות","description":"דוגמה","showRatingSummary":true,"reviews":[]}',null,null),
  'review content cannot enter a revision');
select ok(not cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"מה אומרים","title":"ביקורות","description":"דוגמה","showRatingSummary":true,"url":"https://evil.invalid"}',null,null),
  'arbitrary URL cannot enter a revision');
select ok(not cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"<script>","title":"ביקורות","description":"דוגמה","showRatingSummary":true}',null,null),
  'executable copy is rejected');
select ok(not cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"מה אומרים","title":"ביקורות","description":"דוגמה","showRatingSummary":true}',
  'd3000000-0000-4000-8000-000000000002',null),
  'review block cannot pin arbitrary media');
select ok(not cms_valid_home_block('homeGoogleReviews',
  '{"eyebrow":"מה אומרים","title":"ביקורות","description":"דוגמה","showRatingSummary":true}',null,
  'd3000000-0000-4000-8000-000000000002'),
  'review block cannot pin a promotion revision');
select ok(pg_get_constraintdef(c.oid) like '%homeGoogleReviews%',
  'closed block type constraint includes the review block') from pg_constraint c
  where c.conrelid='public.page_revision_blocks'::regclass and c.conname='page_revision_blocks_block_type_check';
select ok(cms_valid_home_block('homePricing',
  '{"eyebrow":"מחירים","title":"מחירים","mobileDescription":"טקסט","description":"טקסט","factorsHeading":"גורמים","factors":["גורם"],"cards":[{"title":"מחיר","description":"תיאור","icon":"single"}],"ctaLabel":"צרו קשר","ctaNote":"הערה"}',null,null),
  'existing Homepage block remains accepted');

select * from finish();
rollback;
