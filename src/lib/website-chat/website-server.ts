import { createHash, createHmac, randomBytes } from 'node:crypto';
import { emptyThread, parseAction, parseThread } from './contract.ts';
import { failure, json, readJson } from './http.ts';
export type WebsiteChatConfig = { enabled: boolean; origin: string; endpoint: string; secret: string; trustedIp: (r: Request) => string };
const COOKIE = 'cb_chat_session';
export function createWebsiteChatHandler(config: WebsiteChatConfig, transport: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    if (!config.enabled || config.secret.length < 32) return failure('unavailable', 404);
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'POST') return failure('method', 405);
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (request.method === 'POST' && request.headers.get('origin') !== config.origin)) return failure('origin', 403);
    // Next may normalize the internal Request URL to localhost; pin the actual HTTP host.
    if ((request.headers.get('host') || url.host) !== new URL(config.origin).host) return failure('origin', 403);
    const token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const valid = !!token && /^[a-zA-Z0-9_-]{43}$/.test(token);
    if (!valid) {
      if (request.method === 'POST') return failure('session_required', 409);
      const secure = new URL(config.origin).protocol === 'https:' ? '; Secure' : '';
      return json(emptyThread(), 200, { 'Set-Cookie': `${COOKIE}=${randomBytes(32).toString('base64url')}; HttpOnly; SameSite=Lax; Path=/api/website-chat; Max-Age=86400${secure}` });
    }
    let action;
    try { action = request.method === 'GET' ? parseAction({ action: 'poll', cursor: Number(url.searchParams.get('cursor') || 0) }) : parseAction(await readJson(request)); }
    catch { return failure('invalid_body', 400); }
    if (!action) return failure('invalid_body', 400);
    // No campaign identifiers or marketing cookies are read by this functional channel.
    // IP is HMACed before transport; a missing trusted header shares a conservative bucket.
    const rateKey = createHmac('sha256', config.secret).update(config.trustedIp(request) || 'unknown').digest('hex');
    try {
      const response = await transport(config.endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000), headers: { Authorization: `Bearer ${config.secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...action, tokenHash: createHash('sha256').update(token!).digest('hex'), rateKey }) });
      if (!response.ok) {
        const status = [400, 409, 410, 429].includes(response.status) ? response.status : 503;
        return failure(status === 410 ? 'session_expired' : status === 409 ? 'conflict' : status === 429 ? 'rate_limited' : 'unavailable', status);
      }
      const thread=parseThread(await response.json());
      return thread ? json(thread) : failure('unavailable',503);
    } catch { return failure('unavailable', 503); }
  };
}
