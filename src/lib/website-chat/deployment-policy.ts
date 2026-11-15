// Identical website/CRM release binding. No defaults from production into staging.
type Env = Record<string,string|undefined>;
export const CHAT_TARGETS = {
  siteProject:'prj_n7Mm1cepeKANL1jNcNjarNh9QR2A',
  crmProductionProject:'prj_gtYvTJigaUqEwTPf0xFYL4QZQJzV',
  crmStagingProject:'prj_PL3RAgCBK1dkFM9dvKarnzHirifr',
  productionDatabase:'qokukjfnlmjtggbddhkm', stagingDatabase:'ocjwlpszonaprjpjttzz',
  siteProductionOrigin:'https://www.cleanbrothers.co.il', crmProductionOrigin:'https://cleanbrothers-crm.vercel.app',
} as const;
function origin(value:string|undefined):string|null {
  try {const url=new URL(value||'');return url.protocol==='https:' && !url.username && !url.password && !url.port && url.origin===value ? url.origin : null;}catch{return null;}
}
export function websiteChatDeploymentPolicy(env:Env,side:'website'|'crm') {
  if(env.WEBSITE_CHAT_ENABLED!=='1' || (env.WEBSITE_CHAT_INTEGRATION_SECRET?.length??0)<32 || (env.WEBSITE_CHAT_INTEGRATION_SECRET?.length??0)>256)return null;
  if(env.WEBSITE_CHAT_ENVIRONMENT==='local') {
    // Development only, exact loopback ports, independent fresh Docker data.
    if(env.NODE_ENV!=='development' || env.VERCEL || env.VERCEL_ENV || env.WEBSITE_CHAT_LOCAL_APPROVED!=='1' || env.WEBSITE_CHAT_TEST_MODE!=='1')return null;
    const siteOrigin='http://127.0.0.1:56540',crmOrigin='http://127.0.0.1:56541',endpoint=crmOrigin+'/api/integrations/website-chat';
    if(env.WEBSITE_CHAT_SITE_ORIGIN!==siteOrigin || env.WEBSITE_CHAT_CRM_ORIGIN!==crmOrigin || (side==='website' && env.WEBSITE_CHAT_CRM_ENDPOINT!==endpoint) || (side==='crm' && env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:56521'))return null;
    return {mode:'local',siteOrigin,crmOrigin,endpoint,isTest:true};
  }
  if(env.VERCEL!=='1')return null;
  const site=origin(env.WEBSITE_CHAT_SITE_ORIGIN),crm=origin(env.WEBSITE_CHAT_CRM_ORIGIN);
  if(!site || !crm)return null;
  const mode=env.WEBSITE_CHAT_ENVIRONMENT;
  if(mode==='staging') {
    if(env.VERCEL_ENV!=='preview' || env.WEBSITE_CHAT_STAGING_APPROVED!=='1' || env.WEBSITE_CHAT_TEST_MODE!=='1' || env.WEBSITE_CHAT_STAGING_SITE_ORIGIN!==site || env.WEBSITE_CHAT_STAGING_CRM_ORIGIN!==crm)return null;
    const siteHost=new URL(site).hostname,crmHost=new URL(crm).hostname;
    if(!/^cleanbrothers-(?!crm)[a-z0-9-]+-yahavs-projects-6b5e850f\.vercel\.app$/.test(siteHost) || !/^cleanbrothers-crm-staging(?:-[a-z0-9-]+)?\.vercel\.app$/.test(crmHost))return null;
    if(env.VERCEL_PROJECT_ID!==(side==='website'?CHAT_TARGETS.siteProject:CHAT_TARGETS.crmStagingProject))return null;
    if(side==='website' && site!==`https://${env.VERCEL_URL}`)return null;
    if(side==='crm' && env.NEXT_PUBLIC_SUPABASE_URL!==`https://${CHAT_TARGETS.stagingDatabase}.supabase.co`)return null;
  } else if(mode==='production') {
    if(env.VERCEL_ENV!=='production' || env.SITE_REVIEW_MODE==='1' || env.WEBSITE_CHAT_TEST_MODE==='1' || site!==CHAT_TARGETS.siteProductionOrigin || crm!==CHAT_TARGETS.crmProductionOrigin)return null;
    if(env.VERCEL_PROJECT_ID!==(side==='website'?CHAT_TARGETS.siteProject:CHAT_TARGETS.crmProductionProject))return null;
    if(side==='crm' && env.NEXT_PUBLIC_SUPABASE_URL!==`https://${CHAT_TARGETS.productionDatabase}.supabase.co`)return null;
  } else return null;
  const endpoint=crm+'/api/integrations/website-chat';
  if(side==='website' && env.WEBSITE_CHAT_CRM_ENDPOINT!==endpoint)return null;
  return {mode,siteOrigin:site,crmOrigin:crm,endpoint,isTest:mode==='staging'};
}
