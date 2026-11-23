import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppPilotMessage } from "../src/lib/whatsapp-measurement-pilot.ts";

const service = "mini-central-air-conditioner-cleaning";
const humanMessage = "fixture";
const token = "AbCdEfGhIjKlMnOpQrStUv";
const cohort = { utm_source: "google", utm_medium: "cpc", utm_campaign: "24326429732", utm_content: "829563936387" };

for (const field of ["gbraid", "wbraid"]) {
  test(`preserves a consented ${field} through the pilot token request`, async () => {
    const attribution = { ...cohort, [field]: "synthetic_braid" };
    const requests = [];
    const message = await buildWhatsAppPilotMessage({
      enabled: true, allowBraidIds: true, service, attribution, consent: "accepted", humanMessage,
      requestToken: async (payload, consent) => { requests.push({ payload, consent }); return token; },
    });
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].payload, { ...attribution, google_ads_campaign_id: cohort.utm_campaign });
    assert.equal(requests[0].consent.adUserData, "granted");
    assert.ok(message.endsWith("CB-" + token));
    assert.ok(!message.includes("synthetic_braid"));
  });
}

test("retains the direct opening when collection is disabled, invalid or unconsented", async () => {
  const attribution = { ...cohort, gbraid: "synthetic_braid" };
  for (const override of [
    { allowBraidIds: false }, { allowBraidIds: undefined }, { enabled: false },
    { consent: undefined }, { consent: "analytics" }, { consent: "rejected" },
    { attribution: cohort }, { attribution: { ...attribution, gbraid: "bad id" } },
    { attribution: { ...attribution, gclid: "bad id" } },
    { attribution: { ...attribution, utm_campaign: "000" } },
  ]) {
    let requests = 0;
    const result = await buildWhatsAppPilotMessage({
      enabled: true, allowBraidIds: true, service, attribution, consent: "accepted", humanMessage,
      ...override, requestToken: async () => { requests++; return token; },
    });
    assert.equal(requests, 0);
    assert.equal(result, humanMessage);
  }
});
