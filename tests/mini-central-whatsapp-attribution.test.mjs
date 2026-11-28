import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppPilotMessage, getWhatsAppPilotHref, isWhatsAppPilotWindowOpen, WHATSAPP_PILOT } from "../src/lib/whatsapp-measurement-pilot.ts";
import { getWhatsAppMessage } from "../src/lib/whatsapp-messages.ts";

const service = "mini-central-air-conditioner-cleaning";
const humanMessage = getWhatsAppMessage(service);
const attribution = { utm_source: "google", utm_medium: "cpc", utm_campaign: "24326429732", utm_content: "829563936387", gclid: "test_click" };
const token = "AbCdEfGhIjKlMnOpQrStUv";
const input = { enabled: true, service, attribution, consent: "accepted", humanMessage };
const creatives = ["829563936387", "828718026646", "832970587188", "832970559246"];

for (const creative of creatives) {
  test(`consented mini-central click from creative ${creative} requests a synthetic token with its campaign`, async () => {
    const click = { ...attribution, utm_content: creative };
    assert.equal(getWhatsAppPilotHref(service, click), `/api/whatsapp/pilot?service=${service}`);
    let calls = 0;
    const message = await buildWhatsAppPilotMessage({
      ...input, attribution: click, requestToken: async (received, consent) => {
        calls++;
        assert.deepEqual(received, { ...click, google_ads_campaign_id: click.utm_campaign });
        assert.equal(consent.adUserData, "granted");
        return token;
      },
    });
    assert.equal(calls, 1);
    assert.equal(message, humanMessage + "\n\nמספר פנייה אוטומטי: CB-" + token);
  });
}

test("organic, mismatched, unconsented and incomplete visits keep the ordinary message", async () => {
  for (const patch of [
    { enabled: false }, { consent: undefined }, { consent: "rejected" }, { service: WHATSAPP_PILOT.service },
    ...[{}, { ...attribution, utm_source: "organic" }, { ...attribution, utm_medium: "organic" },
      { ...attribution, utm_content: "999" },
      ...creatives.map(utm_content => ({ ...attribution, utm_content, utm_campaign: WHATSAPP_PILOT.campaign })),
      { ...attribution, google_ads_campaign_id: "999" }, { ...attribution, gclid: undefined },
      { ...attribution, gclid: "invalid click" }].map(attribution => ({ attribution })),
  ]) {
    let calls = 0;
    assert.equal(await buildWhatsAppPilotMessage({ ...input, ...patch, requestToken: async () => { calls++; return token; } }), humanMessage);
    assert.equal(calls, 0);
  }
  assert.equal(getWhatsAppPilotHref(service, {}), null);
  assert.equal(getWhatsAppPilotHref(service, { ...attribution, utm_content: "999" }), null);
  for (const utm_content of creatives) {
    assert.equal(getWhatsAppPilotHref(service, { ...attribution, utm_content, utm_campaign: WHATSAPP_PILOT.campaign }), null);
  }
  assert.equal(await buildWhatsAppPilotMessage({ ...input, requestToken: async () => { throw Error("timed out"); } }), humanMessage);
});

test("mini-central has an independent 14-day window", () => {
  const start = "2026-11-19T10:00:00Z";
  const now = Date.parse(start);
  const env = { WHATSAPP_MINI_CENTRAL_PILOT_START_AT: start };
  assert.equal(isWhatsAppPilotWindowOpen({}, now, service), false);
  assert.equal(isWhatsAppPilotWindowOpen(env, now - 1, service), false);
  assert.equal(isWhatsAppPilotWindowOpen(env, now, service), true);
  assert.equal(isWhatsAppPilotWindowOpen(env, now + 14 * 86400000, service), false);
  assert.equal(isWhatsAppPilotWindowOpen(env, now, WHATSAPP_PILOT.service), false);
  const wall = { ...attribution, utm_campaign: WHATSAPP_PILOT.campaign, utm_content: WHATSAPP_PILOT.content };
  assert.equal(getWhatsAppPilotHref(WHATSAPP_PILOT.service, wall), `/api/whatsapp/pilot?service=${WHATSAPP_PILOT.service}`);
});
