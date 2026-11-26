# WhatsApp pilot measurement

The site records one `whatsapp_pilot_v1` runtime event when the pilot route returns a redirect for a non-speculative GET with the existing analytics consent cookie set to `accepted`. The record contains fixed categories: `cohort`, `gate`, `token_request`, and `redirect`. No new cookie, identifier, network request, or database is used.

| Count | How to read it |
| --- | --- |
| Measured pilot requests | Count `whatsapp_pilot_v1` records. Direct WhatsApp links bypassing the pilot route are outside this count. |
| Campaign, window or GCLID rejection | Group by `gate`. The first reported gate is campaign or creative match, then window, then GCLID syntax. The closed-window category also covers a disabled pilot. |
| No consent | The site emits no pilot event when consent is absent, unknown or declined. The count is unavailable under the current consent policy. |
| Token requests attempted | Count records with `token_request` other than `not_attempted` and `not_configured`. A timeout or transport failure leaves receipt uncertain. |
| Outcomes | Group `token_request` by issued, rejected, HTTP failure, invalid response, timeout, or transport failure. An HTTP rejection does not identify which CRM validation rule rejected the request. |
| Redirects | Count `redirect=issued`. This means the site returned an HTTP 307. A delivered WhatsApp message is measured at the CRM. |

Explicit prefetch, prerender and HEAD requests are excluded from the counters. Count one copy of each runtime record if a log export includes repeated delivery of the same record. A user retry can start a new HTTP request and contributes another request. The site creates no identifier to correlate those attempts or to count unique people.

## Compare with CRM

Use the same UTC time interval for the two deployments. Select the website deployment and the `/api/whatsapp/pilot` function in Vercel Runtime Logs, search for `whatsapp_pilot_v1`, and group or count by the fixed categories. Use only the totals when sharing the result. Record the window and the log retention or coverage with the counts.

For a CLI read of the same time window, replace the placeholders below with the approved website deployment ID and ISO 8601 timestamps:

```sh
vercel logs --scope yahavs-projects-6b5e850f --deployment <website-deployment-id> \
  --since <utc-start> --until <utc-end> \
  --query 'requestPath:"/api/whatsapp/pilot" AND whatsapp_pilot_v1' --json
```

If the output includes a continuation cursor, read each page in the same window before counting. Use the existing log delivery identifier, when present, to remove repeated records at page boundaries. A complete set of valid records has one redirect per measured request and one token outcome per attempted token request. Record a missing or truncated interval as unavailable.

Compare the totals for attempted and issued tokens with the CRM's existing aggregate issuance outcomes. Separately compare later inbound token application and linked lead totals from an approved CRM aggregate report. Issuance and receipt can fall in different time intervals. These counts describe separate steps and should not be joined by a user or click identifier. Direct Google Ads message assets are tracked separately and have no site-issued token requirement.

## Pilot windows

The code keeps the existing campaign and creative allowlist and the GCLID requirement. On 26 November 2026 the production settings showed the mini-central and wall-wash cohorts ending on 3 December at 10:03 and 12:04 UTC, respectively. Evidence before either deadline depends on eligible natural traffic during the overlap between the deployed measurement and the pilot window. Perform the comparison within the available log retention. If no eligible sample is observed by the deadline, report insufficient evidence. Any extension or separate measurement deployment requires explicit approval.
