import {createSourceLoader} from "./source-module.mjs";
const load=createSourceLoader();
const {staticMediaInventory:inventory}=load("src/cms/media/static-inventory.ts");
const {resolveMediaProjection}=load("src/cms/media/resolve.ts");
export function baselineMedia(d) {
  if(d.schemaVersion===1)return undefined;
  const rows=[];
  const add=(id,role,position,alt)=>{const e=inventory.find(e=>e.versionId===id);rows.push({media_version_id:id,usage_role:role,position,alt_text:alt,caption:"",provider:"static",width:e.width,height:e.height});};
  d.images.forEach((id,i)=>{add(id,"hero",i,d.imageAlt);add(id,"benefits",i,`תיעוד אמיתי של ${d.publicTitle} על ידי CleanBrothers`);if(i===0)add(id,"result",i,`צילום מהשטח במהלך ${d.publicTitle}`);});
  if(d.beforeAfter){add(d.beforeAfter.beforeImage,"before",0,d.beforeAfter.beforeAlt);add(d.beforeAfter.afterImage,"after",0,d.beforeAfter.afterAlt);}
  return resolveMediaProjection(rows,"public");
}
