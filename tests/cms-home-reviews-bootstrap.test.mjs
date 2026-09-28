import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSourceLoader, plain } from "./helpers/source-module.mjs";

const baseLoad = createSourceLoader({ mocks: {
  "next/image": { __esModule: true, default: props => createElement("img", props) },
  "next/script": { __esModule: true, default: props => createElement("script", props) },
} });
const { homeBaseline } = baseLoad("src/cms/home/baseline.ts");
const { validateHomeDraft } = baseLoad("src/cms/home/model.ts");
const { addHiddenGoogleReviewsBlock, HOME_GOOGLE_REVIEWS_BLOCK_ID } =
  baseLoad("src/cms/home/google-reviews-bootstrap.ts");
const { HomeBlocksView } = baseLoad("src/cms/home/HomeBlocksView.tsx");
const legacy = () => {
  const value = plain(homeBaseline);
  value.blocks.splice(6, 1);
  value.blocks.forEach((block, index) => { block.position = index; });
  return value;
};
const html = (page, reviews) => renderToStaticMarkup(createElement(HomeBlocksView,
  { page, revisionId: "d4000000-0000-4000-8000-000000000099", preview: true, reviews }));

test("historical 11-block revisions stay readable; bootstrap preserves the exact draft and public rendering", () => {
  const published = legacy();
  const current = legacy();
  current.seoTitle = "טיוטה קיימת חדשה יותר";
  current.blocks[1].hidden = true;
  current.blocks[5].payload.description = "שינוי עורך קיים";
  const before = structuredClone(current);
  const result = plain(addHiddenGoogleReviewsBlock(current));
  assert.equal(validateHomeDraft(published).blocks.length, 11);
  assert.equal(validateHomeDraft(current).blocks.length, 11);
  assert.deepEqual(current, before);
  assert.equal(result.blocks.length, 12);
  assert.deepEqual(result.blocks.filter(block => block.type !== "homeGoogleReviews")
    .map(block => ({ ...block, position: 0 })), before.blocks.map(block => ({ ...block, position: 0 })));
  assert.equal(result.seoTitle, current.seoTitle);
  assert.notEqual(result.seoTitle, published.seoTitle);
  assert.equal(result.blocks[6].id, HOME_GOOGLE_REVIEWS_BLOCK_ID);
  assert.equal(result.blocks[6].hidden, true);
  assert.deepEqual(result.blocks[6].payload, plain(homeBaseline.blocks[6].payload));
  assert.equal(result.blocks[5].type, "homeWhyUs");
  assert.equal(result.blocks[7].type, "homePricing");
  assert.equal(html(result), html(current));
  assert.ok(!JSON.stringify(result).includes("reviews.rating"));
  assert.equal(addHiddenGoogleReviewsBlock(result), null);
});

test("bootstrap fails closed on conflicting review identity or unexpected order", () => {
  const wrongReview = legacy();
  wrongReview.blocks.splice(6, 0, { ...plain(homeBaseline.blocks[6]), id: "d4000000-0000-4000-8000-000000000099" });
  wrongReview.blocks.forEach((block, index) => { block.position = index; });
  assert.throws(() => addHiddenGoogleReviewsBlock(wrongReview), /זהות/);
  const wrongId = legacy();
  wrongId.blocks[2].id = HOME_GOOGLE_REVIEWS_BLOCK_ID;
  assert.throws(() => addHiddenGoogleReviewsBlock(wrongId), /זהות/);
  const wrongOrder = legacy();
  [wrongOrder.blocks[5], wrongOrder.blocks[6]] = [wrongOrder.blocks[6], wrongOrder.blocks[5]];
  wrongOrder.blocks.forEach((block, index) => { block.position = index; });
  assert.throws(() => addHiddenGoogleReviewsBlock(wrongOrder), /סדר/);
});

test("bootstrap repository uses authenticated draft CAS, preserves published pointer and creates one immutable revision", async () => {
  const oldDraftId = "d4000000-0000-4000-8000-000000000071";
  const publishedId = "d4000000-0000-4000-8000-000000000051";
  const newDraftId = "d4000000-0000-4000-8000-000000000081";
  const original = legacy();
  original.seoDescription = "טיוטת Revision 7";
  let state = { generation: 7, draftRevisionId: oldDraftId, publishedRevisionId: publishedId,
    draft: structuredClone(original), history: [] };
  const historical = structuredClone(state.draft);
  const calls = [];
  const load = createSourceLoader({ mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "admin" }) },
    "./environment": { requireHomeEnvironment: () => {} },
    "@/cms/server": { createCmsServerClient: async () => ({ rpc: async (name, args) => {
      calls.push(name);
      if (name === "cms_read_home_editor") return { data: state, error: null };
      if (name !== "cms_save_home_draft") throw Error(`Unexpected RPC: ${name}`);
      assert.equal(args.expected_generation, 7);
      assert.equal(args.base_revision, oldDraftId);
      assert.equal(args.restore_revision, null);
      assert.equal(args.payload.seoDescription, original.seoDescription);
      assert.equal(args.payload.blocks.length, 12);
      state = { ...state, generation: 8, draftRevisionId: newDraftId, draft: plain(args.payload) };
      return { data: newDraftId, error: null };
    } }) },
  } });
  const repo = load("src/cms/home/repository.ts");
  const first = await repo.bootstrapHomeGoogleReviews(7, oldDraftId);
  assert.deepEqual(plain(first), { created: true, revision: newDraftId });
  assert.equal(state.publishedRevisionId, publishedId);
  assert.deepEqual(historical, original);
  assert.equal(state.draft.blocks.length, 12);
  assert.deepEqual(calls, ["cms_read_home_editor", "cms_save_home_draft"]);
  const second = await repo.bootstrapHomeGoogleReviews(8, newDraftId);
  assert.deepEqual(plain(second), { created: false, revision: newDraftId });
  assert.deepEqual(calls, ["cms_read_home_editor", "cms_save_home_draft", "cms_read_home_editor"]);
  await assert.rejects(repo.bootstrapHomeGoogleReviews(7, oldDraftId), /עורך אחר/);
  assert.equal(calls.filter(name => name === "cms_save_home_draft").length, 1);
});

test("bootstrap rejects a raced save conflict without creating a second revision", async () => {
  let saves = 0;
  const load = createSourceLoader({ mocks: {
    "@/cms/authorization": { requireCmsAdmin: async () => ({ userId: "admin" }) },
    "./environment": { requireHomeEnvironment: () => {} },
    "@/cms/server": { createCmsServerClient: async () => ({ rpc: async name => {
      if (name === "cms_read_home_editor") return { data: {
        generation: 7, draftRevisionId: "d4000000-0000-4000-8000-000000000071",
        publishedRevisionId: "d4000000-0000-4000-8000-000000000051", draft: legacy(), history: [],
      }, error: null };
      saves++;
      return { data: null, error: { code: "PT409" } };
    } }) },
  } });
  const repo = load("src/cms/home/repository.ts");
  await assert.rejects(repo.bootstrapHomeGoogleReviews(7, "d4000000-0000-4000-8000-000000000071"), /עורך אחר/);
  assert.equal(saves, 1);
});

test("bootstrap action validates Admin and form CAS inputs before invoking the repository", async () => {
  let authorized = false, reads = 0, invalidations = [];
  const load = createSourceLoader({ mocks: {
    "next/cache": { revalidatePath: path => invalidations.push(path) },
    "@/cms/authorization": { requireCmsAdmin: async () => {
      if (!authorized) throw Error("denied");
    } },
    "./repository": { bootstrapHomeGoogleReviews: async (generation, revision) => {
      reads++;
      assert.equal(generation, 7);
      assert.equal(revision, "d4000000-0000-4000-8000-000000000071");
      return { created: true, revision: "d4000000-0000-4000-8000-000000000081" };
    } },
  } });
  const { bootstrapGoogleReviewsAction } = load("src/cms/home/actions.ts");
  const form = new FormData();
  form.set("generation", "7");
  form.set("revision", "d4000000-0000-4000-8000-000000000071");
  assert.equal((await bootstrapGoogleReviewsAction({}, form)).ok, false);
  assert.equal(reads, 0);
  authorized = true;
  form.set("generation", "invalid");
  assert.equal((await bootstrapGoogleReviewsAction({}, form)).ok, false);
  assert.equal(reads, 0);
  form.set("generation", "7");
  const result = await bootstrapGoogleReviewsAction({}, form);
  assert.equal(result.ok, true);
  assert.equal(reads, 1);
  assert.deepEqual(invalidations, ["/admin/pages/home", "/admin/preview/pages/home"]);
  assert.ok(!invalidations.includes("/"));
});
