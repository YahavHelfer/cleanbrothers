import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSourceLoader, plain } from './helpers/source-module.mjs';
const load=createSourceLoader();
const {serviceBaseline}=load('src/cms/content/baseline.ts');
const {validateServiceDraft}=load('src/cms/content/service-model.ts');
const {ServiceLandingView}=load('src/components/ServiceLandingView.tsx');
const {staticServiceConfigs}=load('src/content/static-source.ts');
test('results visibility validates booleans and preserves absent historical flags',()=>{
 const key='mini-central-air-conditioner-cleaning',draft=plain(serviceBaseline(key));
 assert.equal(draft.resultsHidden,true);
 const {resultsHidden,...historical}=draft;
 assert.equal(validateServiceDraft(key,historical).resultsHidden,undefined);
 assert.equal(validateServiceDraft(key,{...draft,resultsHidden:false}).resultsHidden,false);
 for(const value of ['false',null,0,{}])assert.throws(()=>validateServiceDraft(key,{...draft,resultsHidden:value}));
});
test('hidden results remove the entire section while preserving adjacent content and other services',()=>{
 const render=config=>renderToStaticMarkup(ServiceLandingView({config,contact:null,phoneNumber:'0559577731',preview:true}));
 const key='mini-central-air-conditioner-cleaning',config=staticServiceConfigs[key];
 const hidden=render(config);assert(!hidden.includes('data-service-results'));assert(!hidden.includes(config.pageCopy.resultTitle));assert(hidden.includes(config.pageCopy.benefitsTitle));assert(hidden.includes(config.pageCopy.faqTitle));
 assert(render({...config,resultsHidden:false}).includes('data-service-results'));
 for(const [k,c]of Object.entries(staticServiceConfigs))if(k!==key)assert(render(c).includes('data-service-results'),k);
});
