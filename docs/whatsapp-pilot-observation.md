# WhatsApp pilot measurement

The site records one `whatsapp_pilot_v1` runtime event when the pilot route returns a redirect for a non-speculative GET with the existing analytics consent cookie set to `accepted`. The record contains fixed categories: `cohort`, `gate`, `token_request`, and `redirect`. No new cookie, identifier, network request, or database is used.

| Count | How to read it |
| --- | --- |
| Measured pilot requests | Count `whatsapp_pilot_v1` records. Direct WhatsApp links bypassing the pilot route are outside this count. |
| Campaign, window or GCLID rejection | Group by `gate`. The first reported gate is campaign or creative match, then window, then GCLID syntax. The closed-window category also covers a disabled pilot. |
| No consent | The site emits no pilot event when consent is absent, unknown or declined. The count is unavailable under the current consent policy. |
| Token requests attempted | Count records with `token_request` other than `not_attempted` and `not_configured`. A timeout or transport failure leaves receipt uncertain. |
| Outcomes | Group `token_request` by issued, rejected, HTTP failure, invalid response, timeout, or transport failure. Only an explicit rejection response counts as rejected. Timeout (including after headers), interrupted transport, HTTP failure, and an unreadable or invalid success response all leave CRM issuance unknown. A valid returned token confirms issuance from the site’s perspective. |
| Redirects | Count `redirect=issued`. This means the site returned an HTTP 307. A delivered WhatsApp message is measured at the CRM. |

Explicit prefetch, prerender and HEAD requests are excluded from the counters. Count one copy of each runtime record if a log export includes repeated delivery of the same record. A user retry can start a new HTTP request and contributes another request. The site creates no identifier to correlate those attempts or to count unique people.

## Compare with CRM

Use the same UTC time interval for the two deployments. Select the website deployment and the `/api/whatsapp/pilot` function in Vercel Runtime Logs, search for `whatsapp_pilot_v1`, and group or count by the fixed categories. Use only the totals when sharing the result. Record the window and the log retention or coverage with the counts.

### Collection during the pilot

After approved activation, an operator with existing project log access can use the filtered Runtime Logs dashboard. Hobby retains [one hour of runtime logs](https://vercel.com/docs/logs/runtime). Every 15 minutes review the last completed quarter-hour in UTC, allowing five minutes for ingestion. Recheck the preceding interval while still retained and replace its totals if necessary. Use half-open intervals (start inclusive, end exclusive) and the same deployment throughout each interval.

Count only matching application records using the fixed categories above. Keep a private local tally with the deployment, interval, coverage status, category tuple and count. Do not export raw logs, request metadata, or identifiers. Replace an interval on reread instead of adding overlapping counts. Count repeated deliveries of one log entry once if distinguishable in the view. Mark an interval incomplete if results are truncated, retention has expired, or duplicates cannot be resolved. Record zero observed events only for a fully inspected interval. End the final cohort intervals at their respective deadlines.

This is a manual read plan using existing access. Continuous coverage requires an available operator during the intended observation windows. No collector or log drain has been enabled.

Compare the totals for attempted and issued tokens with the CRM's existing aggregate issuance outcomes. Separately compare later inbound token application and linked lead totals from an approved CRM aggregate report. Issuance and receipt can fall in different time intervals. These counts describe separate steps and should not be joined by a user or click identifier. Direct Google Ads message assets are tracked separately and have no site-issued token requirement.

## Pilot windows

The code keeps the existing campaign and creative allowlist and the GCLID requirement. On 26 November 2026 the production settings showed the mini-central and wall-wash cohorts ending on 3 December at 10:03 and 12:04 UTC, respectively. Evidence before either deadline depends on eligible natural traffic during the overlap between the deployed measurement and the pilot window. Perform the comparison within the available log retention. If no eligible sample is observed by the deadline, report insufficient evidence. Any extension or separate measurement deployment requires explicit approval.
