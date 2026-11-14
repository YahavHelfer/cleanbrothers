"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
const WebsiteChat = dynamic(() => import("@/components/WebsiteChat").then(module => module.WebsiteChat));
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { businessConfig } from "@/config/business";
import { isManagedServiceKey, serviceRegistry } from "@/content/service-registry";
import { getWhatsAppMessage, resolveWhatsAppService } from "@/lib/whatsapp-messages";
import { getWhatsAppLink } from "@/lib/whatsapp";

export function ContactAvatar({ pathname, chatEnabled = false }: { pathname: string; chatEnabled?: boolean }) {
  const [chat, setChat] = useState(chatEnabled);
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const key = pathname.replace(/^\//, "");
  const managed = isManagedServiceKey(key);
  const serviceName = managed ? serviceRegistry[key].crmName : undefined;
  const service = resolveWhatsAppService(pathname);
  const contactHref = serviceName ? `/contact?service=${encodeURIComponent(serviceName)}` : "/contact";

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); launcher.current?.focus(); }
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", outside); };
  }, [open]);

  return <>
    {!managed && <a className="mobile-phone-action" href={`tel:${businessConfig.phoneDisplay.replace(/\D/g, "")}`}>התקשרו עכשיו</a>}
    <div ref={root} className="contact-avatar" data-service-page={managed ? "true" : "false"}>
      {open && <div ref={panel} tabIndex={-1} id={id} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} className="contact-avatar-panel">
        <div className="contact-avatar-heading">
          <Image src="/images/mascots/cleanbrothers-mascots.png" alt="" width={96} height={64} />
          <div><p id={`${id}-title`}>דברו עם CleanBrothers</p><span>איך אפשר לעזור?</span></div>
          <button type="button" aria-label="סגירת אפשרויות יצירת קשר" onClick={() => { setOpen(false); launcher.current?.focus(); }}>×</button>
        </div>
        <div className="contact-avatar-content">
          {chatEnabled && <div className="contact-avatar-channel-tabs" aria-label="בחירת ערוץ קשר"><button type="button" aria-pressed={chat} onClick={() => setChat(true)}>צ׳אט באתר</button><button type="button" aria-pressed={!chat} onClick={() => setChat(false)}>וואטסאפ ופרטים</button></div>}
          {chatEnabled && chat && <WebsiteChat service={managed ? key : "general"} pagePath={/^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(pathname) ? pathname : "/"} />}
          <div hidden={chatEnabled && chat}>
          {serviceName && <p className="contact-avatar-service">{serviceName}</p>}
          <p>יש שאלה או רוצים הצעת מחיר? אפשר לשלוח לנו תמונה בוואטסאפ או להשאיר פרטים.</p>
          <a data-whatsapp-location="floating" data-whatsapp-service={service} href={getWhatsAppLink(getWhatsAppMessage(service))}
            className="btn-whatsapp inline-flex" onClick={() => setOpen(false)}>דברו איתנו בוואטסאפ <span aria-hidden="true">↗</span></a>
          <Link className="contact-avatar-form-link" href={contactHref} onClick={() => setOpen(false)}>השאירו פרטים ונחזור אליכם</Link>
          </div>
        </div>
      </div>}
      <button ref={launcher} type="button" aria-expanded={open} aria-controls={id}
        aria-label={open ? "סגירת אפשרויות יצירת קשר" : "דברו איתנו — פתיחת אפשרויות יצירת קשר"}
        className="contact-avatar-launcher" onClick={() => setOpen(value => !value)}>
        <span className="contact-avatar-image"><Image src="/images/mascots/cleanbrothers-mascots.png" alt="" width={120} height={80} /></span>
        <span className="contact-avatar-label"><small>צריכים עזרה?</small><strong>דברו איתנו</strong></span>
        <span className="contact-avatar-chevron" aria-hidden="true">{open ? "×" : "↗"}</span>
      </button>
    </div>
  </>;
}
