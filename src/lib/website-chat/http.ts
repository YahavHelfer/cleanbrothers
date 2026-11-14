import { MAX_BODY } from './contract.ts';
export function json(value: unknown, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers); h.set('Content-Type', 'application/json'); h.set('Cache-Control', 'no-store'); h.set('Vary', 'Cookie'); h.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(value), { status, headers: h });
}
export function failure(code: string, status: number) { return json({ error: code }, status); }
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('body');
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new Error('body');
  const reader = request.body?.getReader(); if (!reader) throw new Error('body');
  let size = 0; const chunks: Uint8Array[] = [];
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX_BODY) throw new Error('body'); chunks.push(value); } }
  finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
