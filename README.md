# CleanBrothers

Premium Hebrew RTL website for CleanBrothers, a professional cleaning service for sofas, upholstery, mattresses, carpets, and car upholstery.

Built with:

- Next.js 16
- TypeScript
- App Router
- Tailwind CSS v4
- RTL Hebrew layout
- Heebo Google Font

## Install

```bash
npm install
```

## Environment Setup

Create a local environment file:

```bash
cp .env.example .env.local
```

Environment variables:

```bash
NEXT_PUBLIC_WHATSAPP_PHONE=972559577731
NEXT_PUBLIC_BUSINESS_PHONE=0559577731
NEXT_PUBLIC_BUSINESS_EMAIL=CleanBrothers.ISR@gmail.com
```

For production, update `NEXT_PUBLIC_WHATSAPP_PHONE` and
`NEXT_PUBLIC_BUSINESS_PHONE` to the real values. `NEXT_PUBLIC_BUSINESS_EMAIL`
controls the public email address. The canonical public site URL is configured
in `src/config/business.ts` and is not overridden by environment variables.

## Development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
```

## Temporary Vercel Deployment

The project is ready for temporary deployment on Vercel.

### Push To GitHub

After creating an empty GitHub repository manually, connect this local project:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git branch -M main
git push -u origin main
```

### Deploy To Vercel

1. Import the GitHub repository in Vercel.
2. Keep the default Next.js build settings:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: managed automatically by Next.js
3. Add these environment variables in Vercel:

```bash
NEXT_PUBLIC_WHATSAPP_PHONE=972559577731
NEXT_PUBLIC_BUSINESS_PHONE=0559577731
NEXT_PUBLIC_BUSINESS_EMAIL=CleanBrothers.ISR@gmail.com
```

A temporary Vercel URL is fine for testing and sharing. Canonical metadata
continues to use the public production domain configured in the business config.

## Where To Update Business Details

Phone and site URL are configured in:

```text
src/config/business.ts
```

The canonical site URL is defined as `CANONICAL_SITE_URL`. Prefer changing the
remaining public business values through environment variables:

- `NEXT_PUBLIC_WHATSAPP_PHONE`
- `NEXT_PUBLIC_BUSINESS_PHONE`
- `NEXT_PUBLIC_BUSINESS_EMAIL`

## Where To Update WhatsApp Message

The default prefilled WhatsApp message is in:

```text
src/config/business.ts
```

The WhatsApp URL helper is in:

```text
src/lib/whatsapp.ts
```

Use `getWhatsAppLink()` for every new CTA.

## Where To Replace Images

Real before/after images should go in:

```text
public/images
```

Gallery and before/after UI uses local images with safe gradient fallbacks in:

```text
src/components/BeforeAfterCard.tsx
```

Replace fallback visuals with real images when production assets are ready.

## SEO

SEO metadata helpers are in:

```text
src/lib/seo.ts
```

Structured data is in:

```text
src/lib/structured-data.ts
```

App Router launch files:

```text
src/app/sitemap.ts
src/app/robots.ts
```

## Notes

- The shared contact form submits through `/api/contact-lead` to the CRM. Its server-only integration requires `CRM_WEBHOOK_SECRET`.
- No paid external libraries are used.
- All pages are Hebrew RTL and mobile-first.

## CMS application boundaries — Phase 1A

The CMS will use a dedicated Supabase project, separate from the CRM. No Supabase
client, authentication provider, database, or editing functionality is connected
in this phase.

- `src/app/(site)/layout.tsx` is the public root layout. All 16 existing public
  pages keep their URLs. Consent bootstrap and all marketing integrations remain
  in this layout, in their existing order.
- `src/app/(admin)/layout.tsx` is a separate root layout for `/admin`. It contains
  a Hebrew RTL placeholder only. It is **not authenticated** and must not contain
  sensitive data or management actions. A prominent warning appears in development.
- `src/app/(preview)/layout.tsx` reserves a separate root layout for future
  preview routes. There is no preview page or endpoint yet. Authorization and
  private, uncached draft reads are prerequisites for adding one.
- Admin and preview layouts do not import the public layout, tracking, cookie UI,
  lead forms, or promotions. Moving between root layouts causes a full navigation.
- Existing API routes, sitemap, robots, canonical configuration, and CRM contracts
  remain unchanged. No deployment or infrastructure configuration is added.

The pilot `/delicate-upholstery-cleaning` reads `src/content/source.ts`, which
selects only `staticContentSource`. The adapter wraps the existing data without
migrating or rewriting it. Its stable service ID resolves a code-owned CRM value
in `service-identity.ts`; an editable display title cannot override that value.
Other services retain their existing rendering and integration behavior.

JSON-LD serialization escapes every literal `<` as `\u003c` before it reaches a
script context. This prevents a string from closing the script element while
preserving the decoded JSON, existing script IDs, and script loading behavior.

Local checks (no live lead or WhatsApp requests):

```bash
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

The test command includes the original suites, service-image tests, and focused
boundary, static-content, CRM-mapping, and JSON-LD regression tests. The production
build needs access to Google Fonts to fetch Heebo. Browser E2E and authenticated
admin behavior are deferred to Phase 1B.
