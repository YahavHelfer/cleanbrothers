"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChatThread } from '@/lib/website-chat/contract';
import { MAX_MESSAGE } from '@/lib/website-chat/contract';

export function WebsiteChat({ service, pagePath }: { service: string; pagePath: string }) {
  const [messages,setMessages]=useState<ChatMessage[]>([]);
  const [ready,setReady]=useState(false);
  const [closed,setClosed]=useState(false);
  const [expired,setExpired]=useState(false);
  const [draft,setDraft]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(false);
  const pending=useRef<{clientMessageId:string;text:string}|null>(null);
  const cursor=useRef(0);
  const mounted=useRef(true);
  const feed=useRef<HTMLDivElement>(null);
  const apply=useCallback((thread:ChatThread)=>{
    if(!mounted.current) return;
    cursor.current=Math.max(cursor.current,thread.nextCursor);
    setMessages(old=>{const map=new Map(old.map(m=>[m.id,m])); for(const m of thread.messages) map.set(m.id,m); return Array.from(map.values()).sort((a,b)=>a.seq-b.seq);});
    if(thread.conversationId) setClosed(thread.status==='closed');
    setReady(true);
    if(!pending.current) setError('');
  },[]);
  useEffect(()=>{
    mounted.current=true;
    let stopped=false; let timer:ReturnType<typeof setTimeout>; let controller:AbortController|undefined;
    async function poll(){
      if(stopped) return;
      if(document.hidden){timer=setTimeout(poll,4000);return;}
      controller=new AbortController();
      let delay=4000;
      try{
        const response=await fetch(`/api/website-chat?cursor=${cursor.current}`,{cache:'no-store',signal:controller.signal});
        if(response.status===410){setExpired(true);setReady(false);return;}
        if(!response.ok) throw new Error('poll');
        const thread:ChatThread=await response.json(); if(stopped)return; apply(thread);
        if(thread.hasMore) delay=50;
      }catch{if(!stopped){setError('החיבור לצ׳אט מתעכב. אפשר לנסות שוב או לפנות בוואטסאפ.');delay=12000;}}
      if(!stopped) timer=setTimeout(poll,delay);
    }
    void poll();
    return()=>{stopped=true;mounted.current=false;clearTimeout(timer);controller?.abort();};
  },[apply]);
  useEffect(()=>{if(feed.current) feed.current.scrollTop=feed.current.scrollHeight;},[messages]);
  async function send(){
    if(busy || !ready || closed || expired) return;
    const item=pending.current || {clientMessageId:crypto.randomUUID(),text:draft.trim()};
    if(!item.text) return;
    pending.current=item;setBusy(true);setRetry(false);setError('');
    try{
      const response=await fetch('/api/website-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',...item,service,pagePath}),signal:AbortSignal.timeout(8000)});
      if(response.status===410){setExpired(true);setReady(false);throw new Error('expired');}
      if(response.status===409){setClosed(true);throw new Error('closed');}
      if(!response.ok) throw new Error('send');
      const thread:ChatThread=await response.json();apply(thread);pending.current=null;
      if(mounted.current) setDraft('');
    }catch{if(mounted.current){setError('לא הצלחנו לאשר שההודעה נשמרה. ניסיון חוזר ישתמש באותו מזהה כדי למנוע כפל.');setRetry(true);}}
    finally{if(mounted.current)setBusy(false);}
  }
  return <div className="website-chat">
    <p className="website-chat-note">צ׳אט עם הצוות. זמני המענה משתנים; השאירו את החלונית פתוחה לקבלת תשובה. טקסט בלבד.</p>
    <div ref={feed} className="website-chat-messages" role="log" aria-label="הודעות הצ׳אט" aria-live="polite" aria-relevant="additions">
      {!messages.length && <p className="website-chat-empty">היי, אנחנו כאן לעזור. במה אפשר לעזור לכם?</p>}
      {messages.map(m=><div key={m.id} className={`website-chat-message website-chat-${m.sender}`}><small>{m.sender==='visitor'?'אתם':'צוות CleanBrothers'}</small><p dir="auto">{m.text}</p></div>)}
    </div>
    {closed && <p role="status">השיחה נסגרה על ידי הצוות. אפשר להמשיך איתנו בוואטסאפ.</p>}
    {expired && <p role="status">תוקף השיחה בדפדפן הסתיים. אפשר להמשיך איתנו בוואטסאפ.</p>}
    {error && <p className="website-chat-error" role="status">{error}</p>}
    <form onSubmit={e=>{e.preventDefault();void send();}}>
      <label htmlFor="website-chat-message">ההודעה שלכם</label>
      <textarea id="website-chat-message" rows={2} maxLength={MAX_MESSAGE} value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy||retry||closed||expired} placeholder="כתבו לנו כאן…" />
      <button type="submit" className="btn-whatsapp" disabled={!ready||busy||closed||expired||(!draft.trim()&&!retry)}>{busy?'שומרים את ההודעה…':retry?'ניסיון חוזר':'שליחת הודעה'}</button>
      {!ready&&!expired&&<span role="status">מתחברים לצ׳אט…</span>}
    </form>
    <p className="website-chat-note">השיחה נשמרת ב־CRM. נא לא לשלוח פרטי תשלום או מידע רגיש. הפעלת הצ׳אט אינה מחייבת הסכמה לשיווק. <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">מדיניות הפרטיות</a></p>
  </div>;
}
