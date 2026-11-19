import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppPilotMessage, getWhatsAppPilotHref, isWhatsAppPilotWindowOpen } from "../src/lib/whatsapp-measurement-pilot.ts";
import { getWhatsAppMessage } from "../src/lib/whatsapp-messages.ts";

const service = "air-conditioner-cleaning";
const attribution = {
  utm_source: "google", utm_medium: "cpc", utm_campaign: "23984473561",
  utm_content: "cb_wa_site_pilot_ac_wash_20261119", gclid: "synthetic_click",
};
const humanMessage = getWhatsAppMessage(service);
const env = { WHATSAPP_ATTRIBUTION_PILOT_ENABLED: "1", WHATSAPP_WALL_WASH_PILOT_START_AT: "2026-11-19T12:00:00Z" };
const start = Date.parse(env.WHATSAPP_WALL_WASH_PILOT_START_AT);
const enabled = isWhatsAppPilotWindowOpen(env, start, service, attribution.utm_content);

test("the replacement ad routes a consented click with its campaign and exact creative tag", async () => {
  assert.equal(enabled, true);
  assert.equal(getWhatsAppPilotHref(service, attribution), "/api/whatsapp/pilot?service=air-conditioner-cleaning");
  let payload;
  const token = "AbCdEfGhIjKlMnOpQrStUv";
  const message = await buildWhatsAppPilotMessage({
    enabled, service, attribution, consent: "accepted", humanMessage,
    requestToken: async (marketing, consent) => { payload = { marketing, consent }; return token; },
  });
  assert.deepEqual(payload.marketing, { ...attribution, google_ads_campaign_id: "23984473561" });
  assert.equal(payload.consent.adUserData, "granted");
  assert.equal(message, humanMessage + "\n\nמספר פנייה אוטומטי: CB-" + token);
});

test("missing consent or click ID, disabled measurement and conflicting campaign do not request a CRM token", async () => {
  for (const patch of [
    { consent: "rejected" }, { consent: undefined }, { enabled: false },
    { attribution: { ...attribution, gclid: undefined } },
    { attribution: { ...attribution, google_ads_campaign_id: "24326429732" } },
    { attribution: { ...attribution, utm_medium: "organic" } },
    { attribution: { ...attribution, utm_content: "another_creative" } },
    { service: "mini-central-air-conditioner-cleaning" },
  ]) {
    let calls = 0;
    const message = await buildWhatsAppPilotMessage({
      enabled, service, attribution, consent: "accepted", humanMessage, ...patch,
      requestToken: async () => { calls++; return null; },
    });
    assert.equal(calls, 0);
    assert.equal(message, humanMessage);
  }
});

test("the replacement has its own bounded window and respects the wall AC switch", () => {
  const open = (settings, now, tag = attribution.utm_content) => isWhatsAppPilotWindowOpen(settings, now, service, tag);
  assert.equal(open(env, start - 1), false);
  assert.equal(open(env, start + 14 * 86400000), false);
  assert.equal(open({ ...env, WHATSAPP_ATTRIBUTION_PILOT_ENABLED: "0" }, start), false);
  assert.equal(open(env, start, "cb_wa_site_pilot_ac_829688140730"), false);
  assert.equal(isWhatsAppPilotWindowOpen(env, start, "mini-central-air-conditioner-cleaning"), false);
});
