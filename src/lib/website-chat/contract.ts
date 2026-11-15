// Version 1: identical on the website and CRM. Text only; no lead/conversion side effects.
export const CHAT_VERSION = 1;
export const MAX_MESSAGE = 3000;
export const MAX_BODY = 16384;
export const services = ['general', 'sofa-cleaning', 'mattress-cleaning', 'carpet-cleaning', 'car-upholstery-cleaning', 'armchair-chair-cleaning', 'delicate-upholstery-cleaning', 'air-conditioner-cleaning', 'window-cleaning', 'mini-central-air-conditioner-cleaning', 'post-renovation-cleaning'] as const;
export type ChatMessage = { id: string; seq: number; sender: 'visitor' | 'agent'; text: string; createdAt: string; clientMessageId: string };
export type ChatThread = { conversationId: string | null; status: 'open' | 'closed'; messages: ChatMessage[]; nextCursor: number; hasMore: boolean };
export type ChatAction = { action: 'poll'; cursor: number } | { action: 'send'; clientMessageId: string; text: string; service: string; pagePath: string };
export function uuid(value: unknown): value is string { return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value); }
export function cursor(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
export function message(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_MESSAGE && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value); }
export function parseAction(value: unknown): ChatAction | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.action === 'poll' && cursor(v.cursor)) return { action: 'poll', cursor: v.cursor };
  if (v.action !== 'send' || !uuid(v.clientMessageId) || !message(v.text) || !services.includes(v.service as typeof services[number]) || typeof v.pagePath !== 'string' || !/^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(v.pagePath) || v.pagePath.length > 200) return null;
  return { action: 'send', clientMessageId: v.clientMessageId.toLowerCase(), text: v.text.trim(), service: String(v.service), pagePath: v.pagePath };
}
export const emptyThread = (): ChatThread => ({ conversationId: null, status: 'open', messages: [], nextCursor: 0, hasMore: false });

export const serviceNames: Record<string,string> = {general:'פנייה כללית','sofa-cleaning':'ניקוי ספות','mattress-cleaning':'ניקוי מזרנים','carpet-cleaning':'ניקוי שטיחים','car-upholstery-cleaning':'ניקוי ריפודי רכב','armchair-chair-cleaning':'ניקוי כורסאות וכיסאות','delicate-upholstery-cleaning':'ניקוי ריפודים עדינים','air-conditioner-cleaning':'ניקוי מזגנים','window-cleaning':'ניקוי חלונות','mini-central-air-conditioner-cleaning':'ניקוי מיני מרכזי','post-renovation-cleaning':'ניקיון אחרי שיפוץ'};
// Validate the server boundary and project public fields; never forward extra CRM fields.
export function parseThread(value:unknown):ChatThread|null {
  if(!value || typeof value!=='object') return null;
  const v=value as Record<string,unknown>;
  if((v.conversationId!==null&&!uuid(v.conversationId)) || !['open','closed'].includes(String(v.status)) || !cursor(v.nextCursor) || typeof v.hasMore!=='boolean' || !Array.isArray(v.messages) || v.messages.length>100)return null;
  const messages:ChatMessage[]=[];const ids=new Set<string>();let previous=0;
  for(const raw of v.messages){
    if(!raw || typeof raw!=='object')return null;const m=raw as Record<string,unknown>;
    if(!uuid(m.id)||!uuid(m.clientMessageId)||!cursor(m.seq)||m.seq<=previous||m.seq>v.nextCursor||ids.has(m.id)||!['visitor','agent'].includes(String(m.sender))||!message(m.text)||typeof m.createdAt!=='string'||!Number.isFinite(Date.parse(m.createdAt)))return null;
    previous=m.seq;ids.add(m.id);messages.push({id:m.id,seq:m.seq,sender:m.sender as ChatMessage['sender'],text:m.text,createdAt:m.createdAt,clientMessageId:m.clientMessageId});
  }
  if(v.conversationId===null&&(messages.length>0||v.nextCursor!==0||v.hasMore))return null;
  return {conversationId:v.conversationId as string|null,status:v.status as ChatThread['status'],messages,nextCursor:v.nextCursor,hasMore:v.hasMore};
}
