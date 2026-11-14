import { createWebsiteChatHandler } from '@/lib/website-chat/website-server';
import { isWebsiteChatEnabled } from '@/lib/website-chat/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function handle(request: Request) {
  const endpoint = process.env.WEBSITE_CHAT_CRM_ENDPOINT || '';
  const origin = process.env.WEBSITE_CHAT_SITE_ORIGIN || '';
  const hosted = process.env.VERCEL === '1';
  // Shared policy pins HTTPS hosted targets or the exact approved local Docker endpoints.
  const enabled = isWebsiteChatEnabled();
  return createWebsiteChatHandler({ enabled, endpoint, origin, secret: process.env.WEBSITE_CHAT_INTEGRATION_SECRET || '',
    trustedIp: r => hosted ? r.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || '' : '',
  })(request);
}
export const GET = handle;
export const POST = handle;
