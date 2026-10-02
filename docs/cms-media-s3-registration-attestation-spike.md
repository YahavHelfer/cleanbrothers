# CMS S3 media registration attestation — local security design

> Historical spike. The [final upload-journal design](cms-media-s3-upload-journal-design.md)
> supersedes its nonce ledger and existing-asset-only registration proposal.

Status: **local design and mock/rollback-only proof**. No AWS account, bucket, IAM identity, S3 request, cloud migration, deployed route, secret, or commit was created. The prior `MediaObjectStore` spike remains unconnected to the application. The existing Supabase media, public-reference RPC, and Canary remain unchanged.

## Decision and trust boundary

Prefer a dedicated **HMAC-SHA256 media-registration key** for the first implementation. `pgcrypto` provides `hmac(bytea,bytea,'sha256')` in the local Supabase Postgres stack; the rollback-only SQL spike exercised it. The currently documented `pgsodium` path is [pending deprecation](https://supabase.com/docs/guides/database/extensions/pgsodium), so making asymmetric verification depend on it is not a sound default. A future supported verifier for Ed25519/P-256 could move the DB to public-key-only verification, but it must be proved on the actual hosted Postgres version and reviewed separately. [PostgreSQL pgcrypto](https://www.postgresql.org/docs/17/pgcrypto.html), [Supabase extension overview](https://supabase.com/docs/guides/database/extensions).

The dedicated HMAC key is **not** a Supabase JWT/service key, AWS credential, CMS auth secret, or `CMS_MEDIA_SERVER_KEY`. The Vercel server would hold signing material in a server-only Production/Preview-specific setting; a private DB schema or Vault would hold the verification copy. It must never be committed, printed, or returned from an RPC. The database copy is a real tradeoff: compromise of either copy permits forged signatures, but an attacker still needs an authorized AAL2 CMS session to use the RPC. A compromised HMAC key alone cannot read S3 objects or bypass CMS authentication. A compromised AAL2 session **plus** that key could forge a registration for a nonexistent S3 object. Rotate via `keyId`, with only a short overlap and no indefinite old-key validity.

An ordinary authenticated browser cannot register `storage_provider='s3'` by sending a UUID, hash, size, dimensions or key. The server must first pass `requireCmsAdmin()`, validate and normalize the image, generate the version UUID, conditionally upload the exact object, and obtain a successful `HeadObject` for the same key and expected metadata. Only then may it sign. The authenticated Supabase RPC independently rechecks AAL2/member, `auth.uid()`, the signature, expiry, field binding, generation and one-use nonce. This is a **server assertion about an S3 HEAD**, not independent S3 verification by Postgres; S3 credentials remain outside Postgres.

## Exact payload and canonical format

The locally prototyped payload has these fixed fields, in this exact order:

```text
keyId = v1
versionId = server-generated UUIDv4
actorUserId = authenticated CMS user UUID
targetAssetId = existing asset UUID or null
expectedGeneration = positive integer or null (same nullness as targetAssetId)
storageProvider = s3
objectKey = cms-media/<versionId>.webp
byteSize = normalized WebP byte length (1..4 MiB)
width, height = validated positive dimensions
mimeType = image/webp
contentHash = lowercase SHA-256 hex of normalized bytes
originalFilename = validated source filename
altText, caption, folder = validated CMS media metadata
issuedAt, expiresAt = integer Unix seconds, maximum 60-second lifetime
nonce = 128-bit random lowercase hex
```

Canonical bytes are UTF-8 for `cms-s3-media-register-v1\n`, followed by one `field=base64(UTF-8 string value)\n` line per field in the order above. A SQL/JS `null` is `~`, distinct from an empty string. JSON property ordering is ignored; unknown or missing fields are rejected. The signature is lowercase hex HMAC-SHA256 of those bytes. The local TypeScript and Postgres implementations share a fixed canonical-fixture SHA-256 test, including null-safe grammar and Unicode support. No generic signing framework or JWT is introduced.

The proposed RPC is `cms_register_external_media_version(target_asset uuid, expected_generation bigint, version_id uuid, details jsonb, metadata jsonb, actor uuid, attestation jsonb, signature text) returns uuid`. It compares every ordinary registration argument against the signed fields. In particular, it must reject changed hash, size, actor, version, target, generation, filename or editable metadata. It must derive the object key itself and accept only `s3`, `image/webp`, the code-owned private bucket identity and `cms-media/<versionId>.webp`; no URL or caller-selected path. The current local SQL spike exercises the **existing-asset replacement** case in an isolated surrogate table. A production RPC must also implement `targetAssetId=null` creation with the same null-bound generation rule and reuse the full existing immutable `media_assets`/`media_versions`/audit lifecycle. The SQL spike is not a migration and is not ready to deploy.

## Replay and transaction model

Use a private `cms_media_registration_nonces` table with a unique `nonce` and version ID. The `SECURITY DEFINER` RPC uses a fixed empty `search_path`, fully qualified tables/functions, no direct table grants, and EXECUTE only for `authenticated`. It checks AAL2/member and `actorUserId=auth.uid()` before verifying the MAC. It compares expiry against DB `clock_timestamp()` (not client time), allows at most five seconds of clock skew and at most sixty seconds of validity, inserts the nonce, locks the target asset row, validates its generation, and inserts the immutable version/asset update/audit event **in one database transaction**. Any exception rolls back nonce consumption and registration together. A unique nonce or version conflict rejects replay. AAL1, nonmember, anonymous and `service_role` cannot invoke registration through the proposed grants. Expired nonce rows can be pruned later; an expired signature remains invalid even after pruning.

The rollback-only [SQL spike](../supabase/spikes/cms_s3_registration_attestation_local.sql) creates a private synthetic key, nonce ledger, AAL2 fixture and surrogate registration table; it proves valid registration, AAL1 denial, unsigned/tampered/expired denial, stale-generation rollback, replay denial, exact grants and SQL/TypeScript canonical parity. Its final `ROLLBACK` leaves no schema, Auth user or media row. It does **not** modify the real `media_versions` constraint or exercise the complete production RPC.

## S3 identity and object contract

Draft role policy for a dedicated private bucket (replace the placeholder only after separate approval):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ExactCMSMediaObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<DEDICATED_BUCKET>/cms-media/*"
    },
    {
      "Sid": "DenyCMSMediaListing",
      "Effect": "Deny",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<DEDICATED_BUCKET>"
    },
    {
      "Sid": "DenyAccountBucketListing",
      "Effect": "Deny",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*"
    }
  ]
}
```

There is no `s3:HeadObject` IAM action: `HeadObject` requires `s3:GetObject`. No bucket administration, ACL, policy mutation, wildcard action or `ListBucket` permission is granted. Explicit list Deny protects against accidental future grants; a dedicated role with no other policies already defaults to denial of bucket administration. If role policy drift is a concern, add explicit Deny for bucket-policy/ACL/public-access-block mutation at provisioning review. [AWS S3 action mapping](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html), [HeadObject permissions](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html).

The role can still GET/PUT/DELETE **known keys** under `cms-media/`; no-list is not no-exfiltration or write-once enforcement. Prefer separate read versus upload/cleanup roles and exact Vercel project/environment OIDC trust rather than a static AWS key, subject to provider validation. Put uses `If-None-Match: *`; a future bucket policy can enforce conditional writes so even a mistakenly unguarded Put cannot overwrite an existing key. [AWS conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html), [enforcement policy](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes-enforce.html), [Vercel AWS OIDC](https://vercel.com/docs/oidc/aws).

The [S3 contract adapter boundary](../src/cms/media/s3-object-backend.ts) accepts only four injected exact-object methods. Its mock proves `PutObject` includes `IfNoneMatch: '*'`, fixed WebP type and version/hash metadata, then `HeadObject` checks existence, length, type and metadata. It never uses ETag as SHA-256. A real SDK adapter must keep the bucket code-owned, omit list APIs, preserve 403/404 ambiguity without `ListBucket`, bound GET bytes, and leave AWS credentials server-side only. No AWS SDK or account was added in this spike.

## Upload, read and orphan handling

- **Upload:** existing exact Origin/Host, AAL2 and image checks remain. Normalize WebP and compute SHA-256, create UUID, record a durable upload attempt keyed by that UUID **before** Put, conditionally Put, HEAD-check, sign a 60-second attestation, and call the authenticated RPC. Do not let the browser sign or call S3. HEAD metadata confirms the request-visible size/type/metadata but is not an independent cryptographic byte proof; bounded GET/hash can be added at upload if required. Read-time SHA-256 remains mandatory.
- **Admin read:** `/admin/media/file/{versionId}` requires active AAL2 Admin and an exact registered version, derives the S3 key, gets at most 4 MiB, verifies size and SHA-256 **before sending any bytes**, then responds private/no-store/noindex. This preserves cross-admin historical reads because authorization is membership-based, not object owner-based.
- **Public read:** `/cms-media/{versionId}` keeps the existing `cms_read_public_media_version` current-publication check and independent public source gates. It gets only that exact registered version and verifies size/hash before response. Historical-only and unreferenced versions remain unavailable. No public S3 URL or presigned URL is needed.
- **Orphan/rollback:** a definite RPC rejection may delete only the just-created exact key after confirming it is unregistered. On timeout/ambiguous commit, never delete automatically; retain the upload-attempt journal with UUID, actor, object key, expected hash, state and timestamp. Reconcile by known IDs with exact HEAD/GET and DB lookup, never `ListObjects`. Archive/unpublish/rollback never delete immutable historical bytes.

Static and legacy Supabase media versions retain their current dispatch paths. A separately approved migration would add `s3` to provider/location constraints, the attestation key/nonce tables, upload-attempt journal, and the dedicated RPC; it would update typed projections and route dispatch without rewriting old rows or touching the Supabase Canary. The existing legacy Supabase private-read issue remains separate.

## Local proof and limits

The [attestation prototype](../src/cms/media/s3-registration-attestation.ts) and [focused tests](../tests/cms-media-s3-attestation.test.mjs) cover canonical serialization, one-minute expiry, forged/changed fields, provider/key rejection, replay simulation, conditional Put/Head verification, no-list interface and exact deletion. The prior object-store tests cover cross-admin historical access at the application callback boundary, current-publication denial before object read, hash failure and immutable version keys. These are mock/rollback-only proofs; they do not establish actual AWS IAM behavior, hosted Supabase extension availability, production RPC correctness or live S3 durability.

No cloud migration, AWS provisioning, Production enablement or commit is authorized by this spike.
