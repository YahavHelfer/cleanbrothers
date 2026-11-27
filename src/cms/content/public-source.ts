import "server-only";
import { miniCentralAirConditionerLanding } from "@/data/miniCentralAirConditionerCopy";
import { applyAcPriceRevision, isUnalignedAcOffer } from "@/content/ac-price-revision";
import { getPublicServiceImages } from "@/cms/service-images/public-source";
import { withSharedServiceImages } from "@/cms/service-images/presentation";
import { requireMediaReadEnvironment } from "@/cms/media/environment";
import { resolveMediaProjection } from "@/cms/media/resolve";
import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCmsConfig } from "@/cms/config";
import { approvedCmsPreviewIdentity } from "@/cms/preview-environment";
import { staticContentSource } from "@/content/static-source";
import { requireContentEnvironment, usesCmsSource } from "./environment";
import { parseRevisionId, PILOT_KEY } from "./pilot-model";

import { requireServiceKey, type SharedServiceKey } from "@/content/service-registry";
import { toServiceLanding } from "./service-model";

export { usesCmsSource } from "./environment";

// React request memoization shares exactly one immutable published snapshot
// between generateMetadata and page rendering. No session or privileged key.
export const getPublicService = cache(async (key: SharedServiceKey) => {
  requireServiceKey(key);
  if (!usesCmsSource(key)) return { revisionId: null, page: withSharedServiceImages(staticContentSource.getServiceLanding(key), await getPublicServiceImages(key)) };
  requireContentEnvironment();
  await connection();
  const { url, key: publishableKey } = getCmsConfig();
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
  const { data, error } = await (key === PILOT_KEY ? client.rpc("cms_read_published_pilot") : client.rpc("cms_read_published_service", { target_key: key }));
  if (error || !data) throw new Error("Published CMS service unavailable");
  const media = data.payload.schemaVersion >= 2 ? (() => {
    requireMediaReadEnvironment();
    return resolveMediaProjection(data.media, "public");
  })() : undefined;
  const page = withSharedServiceImages(toServiceLanding(key, data.payload, media), await getPublicServiceImages(key));
  return { revisionId: parseRevisionId(data.revisionId), page: key === "mini-central-air-conditioner-cleaning" ? { ...page, content: { ...applyAcPriceRevision(page.content, "mini"),
    h1: miniCentralAirConditionerLanding.h1, metaDescription: miniCentralAirConditionerLanding.metaDescription,
    signsTitle: miniCentralAirConditionerLanding.signsTitle, signsDescription: miniCentralAirConditionerLanding.signsDescription,
    benefitsDescription: miniCentralAirConditionerLanding.benefitsDescription } } : page };
});

export const getPublicPilot = () => getPublicService(PILOT_KEY);

import { isSpecialServiceKey, type SpecialServiceKey } from "@/content/service-registry";
import { acBaseline, windowBaseline } from "./special-baseline";
import { validateSpecialContent } from "./special-model";
// Older published revisions still advertise horsepower tiers. Apply the approved
// tariff to their commercial copy without changing media or service coverage.
function applyPublishedWallAcPrice(content: typeof acBaseline): typeof acBaseline {
  const { startingPrice, regularPrice } = acBaseline.promotion;
  if (content.promotion.startingPrice === startingPrice && content.promotion.regularPrice === regularPrice &&
      !content.promotion.bundleEnabled && !isUnalignedAcOffer(content)) return content;
  return {
    ...content,
    copy: {
      ...content.copy,
      heroEyebrow: acBaseline.copy.heroEyebrow,
      heroDescription: acBaseline.copy.heroDescription,
      heroCta: acBaseline.copy.heroCta,
      processDescription: acBaseline.copy.processDescription,
      pricingEyebrow: acBaseline.copy.pricingEyebrow,
      pricingDescription: acBaseline.copy.pricingDescription,
      pricingCta: acBaseline.copy.pricingCta,
      multipleDescription: acBaseline.copy.multipleDescription,
      areasDescription: acBaseline.copy.areasDescription,
      contactEyebrow: acBaseline.copy.contactEyebrow,
      contactDescription: acBaseline.copy.contactDescription,
      contactCta: acBaseline.copy.contactCta,
    },
    promotion: { ...content.promotion, startingPrice, regularPrice, bundleEnabled: false,
      heroLabel: acBaseline.promotion.heroLabel, badge: acBaseline.promotion.badge, bundleTerms: acBaseline.promotion.bundleTerms,
      description: acBaseline.promotion.description, priceTerms: acBaseline.promotion.priceTerms,
      pricePrefix: acBaseline.promotion.pricePrefix, cta: acBaseline.promotion.cta },
    trustItems: content.trustItems.map(item => /מחיר קבוע|בכל הספק/.test(item) ? "מחיר פתיחה כולל מע״מ" : item),
    processSteps: content.processSteps.map(step => step.includes("הערכת מחיר") ? "מאשרים את מספר המזגנים" : step),
    faqs: content.faqs.map(faq => faq.question.includes("כמה מזגנים")
      ? { ...faq, answer: acBaseline.copy.multipleDescription } : faq),
  };
}
export const getPublicSpecialService = cache(async (key: SpecialServiceKey) => {
  if (!isSpecialServiceKey(key)) throw new Error("Unsupported special service");
  // AC can be enabled later on the stable Preview alias. Keep its approved
  // Preview route request-rendered even before allowlisting, so a static
  // baseline response cannot outlive the deployment that produced it.
  const acPreview = key === "air-conditioner-cleaning" && approvedCmsPreviewIdentity();
  if (acPreview) await connection();
  if (!usesCmsSource(key)) return { revisionId: null, content: key === "air-conditioner-cleaning" ? acBaseline : windowBaseline, media: undefined, images: await getPublicServiceImages(key) };
  requireContentEnvironment();
  requireMediaReadEnvironment();
  if (!acPreview) await connection();
  const { url, key: publishableKey } = getCmsConfig();
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) } });
  const { data, error } = await client.rpc("cms_read_published_service", { target_key: key });
  if (error || !data) throw new Error("Published CMS service unavailable");
  const content = validateSpecialContent(key, data.payload);
  const publicContent = content.schemaVersion === 4 ? applyPublishedWallAcPrice(applyAcPriceRevision(content, "wall")) : content;
  return { revisionId: parseRevisionId(data.revisionId), content: publicContent.schemaVersion === 4 ? {
    ...publicContent,
    h1: acBaseline.h1, seoTitle: acBaseline.seoTitle, seoDescription: acBaseline.seoDescription,
    copy: { ...publicContent.copy, signsTitle: acBaseline.copy.signsTitle, cleaningTitle: acBaseline.copy.cleaningTitle,
      processTitle: acBaseline.copy.processTitle, pricingTitle: acBaseline.copy.pricingTitle, faqTitle: acBaseline.copy.faqTitle },
  } : publicContent, media: resolveMediaProjection(data.media, "public"), images: await getPublicServiceImages(key) };
});
