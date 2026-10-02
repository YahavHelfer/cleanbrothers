# S3-backed CMS media — local implementation and protected Preview pilot

Status: local code and migration only. No AWS resource, cloud migration, Vercel
environment change, content publish or Production activation was performed.

## Trust boundary

The browser posts one bounded image to the existing same-origin Admin route.
That route requires CMS Admin membership and AAL2, rejects a missing or foreign
Origin, normalizes the image to WebP, generates a UUIDv4, and derives only the
key cms-media/{versionId}.webp. The server alone holds AWS credentials. S3 is
a private byte store; Supabase retains identity, journal, metadata, immutable
version IDs, current-publication references and audit. No browser S3 request,
bucket listing, service-role key, Vault secret, HMAC design or
CMS_MEDIA_SERVER_KEY participates in new Preview uploads.

Migration 20261002120000_cms_s3_media.sql adds s3 as an exact provider,
cms_media_upload_attempts, and a one-row SHA-256 hash of the independent server
capability. The migration creates **no credential row or secret**. The random
32-byte capability must later be provisioned separately: its raw 64-character
lowercase hex value goes only into protected Preview server environment storage
as CMS_MEDIA_UPLOAD_CAPABILITY; only SHA256(decoded-token-bytes) goes into
public.cms_external_media_capability.token_hash, using a confidential
parameterized operator session. It must not appear in SQL migration, Git,
browser payloads, logs or screenshots. The mark-uploaded RPC also requires
the same actor's live AAL2 session and matches exact UUID, object key, size
and hash. Replay and another actor fail. This token is **not** an AWS
credential and cannot execute generic database writes.

Registration locks the journal row, checks actor and uploaded state, checks
asset generation, and atomically creates an immutable media version, updates
the current asset pointer, writes audit and marks the journal registered. An
uncertain S3 or registration outcome is marked ambiguous and never
automatically deleted. A definite registration rejection is recorded before
deleting only the generated exact object; if deletion fails, the row remains
visible for reconciliation. The Admin library shows known journal IDs/statuses
and never enumerates S3.

Admin historical reads use AAL2 to authorize an exact media version, then the
server reads one S3 key and verifies size/hash. Public /cms-media/{versionId}
first uses the existing current-publication RPC and explicit public-source
gates. A draft or historical-only version remains 404; rollback can make its
same immutable bytes public again. Static and legacy Supabase versions retain
their existing behavior.

## Exact protected Preview configuration

After separately approving AWS resources, cloud migration and one
server-capability provisioning operation, configure these **server-only**
variables on the approved Preview branch only:

- CMS_MEDIA_S3_PREVIEW_ENABLED=1
- CMS_MEDIA_S3_REGION=<AWS region>
- CMS_MEDIA_S3_BUCKET=<dedicated private bucket name>
- CMS_MEDIA_S3_ACCESS_KEY_ID=<dedicated IAM access key ID>
- CMS_MEDIA_S3_SECRET_ACCESS_KEY=<dedicated IAM secret>
- CMS_MEDIA_UPLOAD_CAPABILITY=<independent random 32-byte hex token>

The existing CMS Preview project, branch, Supabase, published-source, service
allowlist and CMS_MEDIA_PREVIEW_ENABLED=1 gates remain required. No S3 variable
is needed in Production. Production's current media behavior is unchanged.
The capability and AWS key must not use NEXT_PUBLIC_*.

The pilot should publish media only on a page/route explicitly allowlisted in
protected Preview and **not** served from CMS in Production, because the CMS
database is shared. Do not publish an S3 reference in one of the nine
Production CMS-backed services until a separately approved Production S3
rollout. The pilot must verify upload, library thumbnail, version selection,
Exact Preview, public 200 while currently published, second immutable version,
old version public 404 after replacement, rollback, and cross-admin historical
read. Keep the existing Supabase Storage Canary untouched.

## One AWS provisioning request

Create one dedicated general-purpose S3 bucket in the selected AWS region,
with Block Public Access enabled, Object Ownership set to bucket-owner
enforced, no static website hosting and no browser CORS grant. Use a dedicated
server-side IAM identity with one access key restricted to the exact policy in
[cms-media-s3-iam-policy.proposed.json](cms-media-s3-iam-policy.proposed.json):
GetObject, PutObject and DeleteObject only on the object ARN
arn:aws:s3:::<DEDICATED_BUCKET>/cms-media/*, with explicit Deny on ListBucket,
ListBucketVersions, ListBucketMultipartUploads and ListAllMyBuckets. No other
AWS permissions. The bucket name should be unique, lowercase and without
dots; provide its name and region, plus the access key through a secret channel
directly into Vercel Preview. No credential value is needed in the report.

Before the live pilot, separately approve application of migration #24 to the
dedicated CMS Supabase project and provisioning the capability hash. A cloud
dry-run must show only that migration. No Production environment, CRM,
scheduler or Google setting belongs to this rollout.
