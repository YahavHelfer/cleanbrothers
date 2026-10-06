import assert from "node:assert/strict";
import test from "node:test";
import {createSourceLoader,plain} from "./helpers/source-module.mjs";
test("existing image readers preserve all historical collections when mini-central is added",()=>{
 const load=createSourceLoader();
 const old=plain(load("src/cms/home/service-card-images.ts").baselineImageCollections());
 const next={...old,"mini-central-air-conditioner-cleaning":[]};
 const result=plain(load("src/cms/service-images/model.ts").validateImageCollections(next));
 for(const key of Object.keys(old)) assert.deepEqual(result[key],old[key]);
 assert.throws(()=>load("src/cms/service-images/model.ts").validateImageCollections({...next,unexpected:[]}));
});
