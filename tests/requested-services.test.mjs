import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function loadOptions(){
 const source=readFileSync('src/data/site.ts','utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,require:()=>new Proxy({},{get:()=>new Proxy({},{get:()=>[]})})});return exports;
}
test('contact form separates the CRM stable values and keeps legacy landing options',()=>{
 const {contactServiceOptions,serviceOptions}=loadOptions();
 for(const id of ['before_occupancy','after_renovation'])assert.equal(contactServiceOptions.filter(option=>option.value===id).length,1);
 assert.ok(serviceOptions.includes('ניקיון אחרי שיפוץ ולפני אכלוס'));
 assert.equal(contactServiceOptions.some(option=>option.value==='ניקיון אחרי שיפוץ ולפני אכלוס'),false);
});
