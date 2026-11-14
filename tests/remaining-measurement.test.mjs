import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createSourceLoader } from './helpers/source-module.mjs';
import { sanitizeMarketingAttribution, chooseFirstTouchAttribution } from '../src/lib/marketing-attribution-shared.ts';

test('campaign IDs survive first-touch and reject malformed identifiers', () => {
  const first = {google_ads_campaign_id:'24326429732',utm_source:'google',utm_medium:'cpc'};
  assert.deepEqual(chooseFirstTouchAttribution(first,{google_ads_campaign_id:'23984473561'},'https://www.cleanbrothers.co.il'),first);
  for (const id of ['{campaignid}','24326429732.0','x','9'.repeat(21),'']) assert.equal(sanitizeMarketingAttribution({google_ads_campaign_id:id}).google_ads_campaign_id,undefined);
});

test('contact route preserves a campaign ID through the CRM contract with mocked transport', async () => {
  const id='11111111-1111-4111-8111-111111111111';
  const calls=[];
  const load=createSourceLoader({env:{CRM_WEBHOOK_SECRET:'synthetic'},fetchImpl:async(url,init)=>{
    calls.push(JSON.parse(init.body));
    return Response.json({status:'converted',leadId:'lead-1',eventId:'event-1',created:true,duplicate:false,conversionEligible:true,submissionId:id,conversionTransactionId:id});
  }});
  const {POST}=load('src/app/api/contact-lead/route.ts');
  const result=await POST(new Request('https://example.invalid/api/contact-lead',{method:'POST',body:JSON.stringify({submissionId:id,full_name:'Synthetic',phone:'0500000000',service:'ניקוי מזגנים',marketingAttribution:{google_ads_campaign_id:'24326429732',utm_source:'google',gclid:'synthetic-click'}})}));
  assert.equal(result.status,200);
  assert.equal(calls.length,1);
  assert.equal(calls[0].marketingAttribution.google_ads_campaign_id,'24326429732');
  assert.equal((await result.json()).conversionTransactionId,id);
});

function callTrackingHarness() {
  let consent=true;
  const observers=[];
  const business={dataset:{},href:'tel:0559577731',getAttribute(){return this.href;},setAttribute(_,v){this.href=v;}};
  const unrelated={...business,dataset:{},href:'tel:031234567'};
  const label={textContent:'055-9577731',dataset:{googleCallOriginalNumber:'055-9577731'}};
  const exports={};
  const globals={exports,window:{},document:{body:{},getElementsByClassName:()=>[label],querySelectorAll:selector=>selector.includes('data-google')?[business,unrelated].filter(x=>x.dataset.googleCallOriginalHref):[business,unrelated]},MutationObserver:class {constructor(cb){this.cb=cb;this.disconnected=false;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},require:specifier=>specifier.endsWith('consent')?{hasAdStorageConsent:()=>consent}:{GOOGLE_CALL_CONVERSION_NUMBER_CLASS:'tracked'}};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/google-call-tracking.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,globals);
  return {api:exports,business,unrelated,label,observers,setConsent:value=>consent=value};
}

test('Google forwarding updates both display and local-number dial link, preserving unrelated numbers', () => {
  const h=callTrackingHarness();
  assert.equal(h.api.receiveGoogleCallConversion('03-5550000','035550000','+972559577731'),true);
  assert.equal(h.business.href,'tel:035550000');
  assert.equal(h.label.textContent,'03-5550000');
  assert.equal(h.unrelated.href,'tel:031234567');
  h.api.restoreOriginalGoogleCallNumbers();
  assert.equal(h.business.href,'tel:0559577731');
  assert.equal(h.label.textContent,'055-9577731');
});

test('repeated forwarding callbacks replace the observer and revocation restores original links', () => {
  const h=callTrackingHarness();
  h.api.receiveGoogleCallConversion('03-5550000','035550000','0559577731');
  h.api.receiveGoogleCallConversion('03-5550001','035550001','0559577731');
  assert.equal(h.observers.length,2);
  assert.equal(h.observers[0].disconnected,true);
  assert.equal(h.observers[1].disconnected,false);
  h.setConsent(false);
  h.api.restoreOriginalGoogleCallNumbers();
  assert.equal(h.observers[1].disconnected,true);
  assert.equal(h.business.href,'tel:0559577731');
  assert.equal(h.api.resumeGoogleCallConversion(),false);
});

test('forwarding callback without consent leaves dial targets and labels unchanged', () => {
  const h=callTrackingHarness(); h.setConsent(false);
  assert.equal(h.api.receiveGoogleCallConversion('03-5550000','035550000','0559577731'),false);
  assert.equal(h.business.href,'tel:0559577731');
  assert.equal(h.observers.length,0);
});
