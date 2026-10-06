import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";
const load = createSourceLoader();
const { managedServiceKeys, sharedServiceKeys, serviceRegistry } = load("src/content/service-registry.ts");
const { baselineImageCollections } = load("src/cms/home/service-card-images.ts");
const { validateImageCollections } = load("src/cms/service-images/model.ts");
const collections = () => plain(baselineImageCollections());

test("all ten stable service identities have one strictly validated collection; explicit emptiness is retained", () => {
  const input = collections(); input["sofa-cleaning"] = [];
  assert.deepEqual(plain(validateImageCollections(input)), input);
  for(const mutate of [p=>delete p["sofa-cleaning"],p=>p["ניקוי ספות"]=[],p=>p["unknown"]=[],
    p=>p["sofa-cleaning"]=[{versionId:"/image.jpg",alt:"x",position:"object-center"}],
    p=>p["carpet-cleaning"][0].alt="<script>",p=>p["carpet-cleaning"].push(p["carpet-cleaning"][0]),
    p=>p["carpet-cleaning"][0].position="fixed inset-0"]) {
    const invalid=collections();mutate(invalid);assert.throws(()=>validateImageCollections(invalid));
  }
});

test("shared public reader uses one published home projection, including services absent from homepage cards", async () => {
  const serviceImages = collections();
  serviceImages["sofa-cleaning"].reverse();serviceImages["sofa-cleaning"][0].alt="Editor's ordered alt";
  serviceImages["window-cleaning"] = [];
  const media=load("src/cms/home/HomeBlocksView.tsx").staticHomeMedia;
  let reads=0;
  const source=createSourceLoader({mocks:{"@/cms/home/public-source":{getPublicHome:async()=>{reads++;return {serviceImages,media};}}}})("src/cms/service-images/public-source.ts");
  for(const key of managedServiceKeys){
    const result=plain(await source.getPublicServiceImages(key));
    assert.deepEqual(result.map(image=>({versionId:image.versionId,alt:image.alt,position:image.position})),serviceImages[key]);
    assert.deepEqual(result.map(image=>image.src),serviceImages[key].map(image=>media[image.versionId].src));
  }
  assert.equal(reads,10); // React request cache is tested in real requests, not outside request scope.
  await assert.rejects(()=>source.getPublicServiceImages("Unknown title"));
});

test("primary and carousel images follow the shared order and per-image alt; result photo follows the shared primary while before-after remains separate", async () => {
  const images=[{versionId:"1733a278-1a4c-4230-860d-0db0e62cc57a",src:"/shared-first.webp",alt:"First custom alt",position:"object-center"},
    {versionId:"bfaa5d53-8085-4fd4-826a-69b9a18ace18",src:"/shared-second.webp",alt:"Second custom alt",position:"object-[center_42%]"}];
  const consumer=createSourceLoader({mocks:{"@/cms/service-images/public-source":{getPublicServiceImages:async()=>images}}});
  for(const key of sharedServiceKeys){
    const original=load("src/content/static-source.ts").staticContentSource.getServiceLanding(key);
    const result=plain((await consumer("src/cms/content/public-source.ts").getPublicService(key)).page);
    assert.deepEqual(result.content.images,images.map(image=>image.src));
    assert.equal(load("src/lib/service-images.ts").getPrimaryServiceImage(result.content),images[0].src);
    assert.deepEqual(result.content.mediaPresentation.heroAlts,Object.fromEntries(images.map(i=>[i.src,i.alt])));
    assert.deepEqual(result.content.beforeAfter,plain(original.content).beforeAfter);
    assert.equal(result.content.mediaPresentation.resultAlt, images[0].alt);
  }
  for(const key of ["air-conditioner-cleaning","window-cleaning"]){
    const result=await consumer("src/cms/content/public-source.ts").getPublicSpecialService(key);
    assert.deepEqual(result.images,images);
    assert.deepEqual(plain(result.content.media.gallery ?? []),plain(load("src/cms/content/special-baseline.ts")[key==='window-cleaning'?'windowBaseline':'acBaseline'].media.gallery ?? []));
  }
});

test("intentional empty collection overrides old primary image instead of restoring removed photography", async () => {
  const consumer=createSourceLoader({mocks:{"@/cms/service-images/public-source":{getPublicServiceImages:async()=>[]}}});
  const result=(await consumer("src/cms/content/public-source.ts").getPublicService("sofa-cleaning")).page;
  assert.deepEqual(plain(result.content.images),[]);
  assert.deepEqual(plain(load("src/lib/service-images.ts").getServiceImages({image:"/legacy.jpg",images:[]})),[]);
  assert.equal(load("src/lib/service-images.ts").getPrimaryServiceImage(result.content),"");
  assert.equal(result.content.mediaPresentation.resultAlt,result.displayTitle);
  const metadata=load("src/components/ServiceLandingPage.tsx").buildServiceLandingMetadata({...result.content,serviceName:result.displayTitle});
  assert.deepEqual(plain(metadata.openGraph.images),[]);
});

test("saving and publishing invalidate every related public route", async () => {
  const invalidated=[];let writes=0;
  const actions=createSourceLoader({mocks:{"next/cache":{revalidatePath:path=>invalidated.push(path)},
    "@/cms/authorization":{requireCmsAdmin:async()=>({userId:"admin"})},
    "./repository":{mutateHome:async()=>{writes++;return "d4000000-0000-4000-8000-000000000001";}}}})("src/cms/home/actions.ts");
  const form=new FormData();form.set("generation","1");form.set("revision","d4000000-0000-4000-8000-000000000001");form.set("intent","publish");form.set("confirmPublish","yes");
  assert.equal((await actions.homeAction({},form)).ok,true);assert.equal(writes,1);
  assert.deepEqual(invalidated,["/admin/pages","/admin/pages/home","/","/services",...managedServiceKeys.map(key=>serviceRegistry[key].path)]);
});

test("conflicting service image controls link to shared editor while unrelated editorial galleries remain",()=>{
  const generic=readFileSync("src/cms/content/ServiceEditor.tsx","utf8");
  assert.match(generic,/admin\/pages\/home#service-images-/);assert.match(generic,/key !== "imageAlt"/);
  assert.doesNotMatch(generic,/הוספת תמונה|PILOT_IMAGES|update\("images"/);
  assert.match(generic,/תמונות לפני ואחרי/);
  const special=readFileSync("src/cms/content/SpecialServiceEditor.tsx","utf8");
  assert.match(special,/path === "content.media.hero"/);
});
