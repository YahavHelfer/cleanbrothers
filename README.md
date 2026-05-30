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
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WHATSAPP_PHONE=9725XXXXXXXX
NEXT_PUBLIC_BUSINESS_PHONE=05X-XXXXXXX
```

For production, update `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_PHONE`, and
`NEXT_PUBLIC_BUSINESS_PHONE` to the real values.

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
NEXT_PUBLIC_SITE_URL=https://your-temporary-vercel-url.vercel.app
NEXT_PUBLIC_WHATSAPP_PHONE=9725XXXXXXXX
NEXT_PUBLIC_BUSINESS_PHONE=05X-XXXXXXX
```

A temporary Vercel URL is fine for testing and sharing. Later, after connecting
the real domain, replace `NEXT_PUBLIC_SITE_URL` with the production domain.

## Where To Update Business Details

Phone and site URL are configured in:

```text
src/config/business.ts
```

Prefer changing values through environment variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_WHATSAPP_PHONE`
- `NEXT_PUBLIC_BUSINESS_PHONE`

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

Current gallery and before/after UI uses safe gradient fallbacks in:

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

- The contact form is frontend-only and does not submit to a backend yet.
- No paid external libraries are used.
- All pages are Hebrew RTL and mobile-first.
