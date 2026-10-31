# Window cleaning search campaign — pre-launch checklist (31 Oct 2026)

Campaign ID: 24259838835. Keep **PAUSED** until explicit approval.
Approved planned daily budget: **₪35** (not yet applied).
Audience: residential and business customers, including storefronts; no rope access/sanpel.

## Verified in Google Ads (read-only HYPD)
- Search campaign, paused, current daily budget ₪15, maximize conversions.
- One ad group and one approved responsive search ad.
- Ad final URL is homepage https://www.cleanbrothers.co.il/ — not a dedicated landing page.
- Search partners enabled; display disabled.
- Location positive targeting PRESENCE_OR_INTEREST; switch to PRESENCE.
- 14 positive location criteria plus four 1-mile proximity targets; verify actual coverage before editing.
- 15 campaign-level negative keywords already present, including jobs, DIY, robots and supplies.
- Historical terms include product searches (e.g. טירולר מנקה חלונות) and ניקוי חלונות ירושלים. Avoid broad location exclusions without verifying service boundaries.
- Search-term report shows conversion/count inconsistencies versus campaign report; reconcile date ranges and conversion attribution before using historical CPA.

## Proposed campaign changes (not applied)
1. Set daily budget ₪35, keep campaign PAUSED.
2. Change location targeting to PRESENCE; review city/radius coverage from Hadera to Ashdod.
3. Disable Search Partners for the initial controlled test.
4. Organize distinct ad groups: residential, commercial (storefronts, restaurants, offices), post-renovation.
5. Add only service-intent exact/phrase keywords. Preserve relevant competitor traffic; exclude shopping/device queries and rope-access services.
6. Create separate ads/landing-page messaging for home vs business services; only claim services and prices that are actually offered.
7. Verify conversion action wiring for website forms, calls and CRM-qualified WhatsApp leads. Do not treat a WhatsApp click as a confirmed qualified lead.
8. Test mobile navigation, page speed, CTA and form submission, consent handling, UTM/gclid preservation and CRM attribution.
9. Verify tracking in production using non-billable controlled QA before enabling the campaign.

## Deployment safeguards
- No edits to Google Ads performed: current HYPD connection is read-only.
- No production deployment or site change.
- Do not activate campaign or merge this branch until explicit sign-off.
- Do not change shared WhatsApp tracking or global analytics without regression tests across all services.

## Live landing page audit — verified 31 Oct 2026
- Existing dedicated page: https://www.cleanbrothers.co.il/window-cleaning (confirmed live).
- Hero states residential and business window cleaning; page includes WhatsApp CTA, phone and a lead form, cleaning scope, renovation FAQ, and explicit no-height/no-rope-access restriction.
- **Critical ad-to-page mismatch:** active RSA final URL in paused campaign still points to homepage. Change to dedicated window-cleaning URL before launch.
- Business copy presently emphasizes offices; extend with stores, storefront windows, restaurants and ongoing service **only after confirming operational availability**.
- Verify form service selection defaults to window cleaning and attribution is persisted through CRM; static HTML alone cannot establish functional tracking.
- Test actual WhatsApp CTA click path on mobile and conversion event (click is not necessarily qualified lead).
- Check location targeting and page service area are aligned.
- No production page edits have been made.
