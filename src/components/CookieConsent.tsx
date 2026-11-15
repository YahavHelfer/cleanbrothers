"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getStoredConsent, subscribeToConsentChanges, subscribeToConsentPreferenceRequests,
  updateConsent, type ConsentChoice } from "@/lib/consent";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>("unknown");
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function restore(next: ConsentChoice) {
      setChoice(next); setAnalytics(next === "accepted" || next === "analytics");
      setMarketing(next === "accepted" || next === "marketing");
    }
    const timeout = window.setTimeout(() => {
      const stored = getStoredConsent(); restore(stored); setIsVisible(stored === "unknown");
    }, 0);
    const unsubscribe = subscribeToConsentChanges(restore);
    const preferences = subscribeToConsentPreferenceRequests(() => {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setIsVisible(true); setCustomize(true);
      window.setTimeout(() => acceptButtonRef.current?.focus(), 0);
    });
    return () => { clearTimeout(timeout); unsubscribe(); preferences(); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!isVisible || !bannerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty("--cookie-clearance", `${Math.ceil(entry.target.getBoundingClientRect().height) + 24}px`);
    });
    observer.observe(bannerRef.current);
    return () => { observer.disconnect(); root.style.removeProperty("--cookie-clearance"); };
  }, [isVisible]);

  function choose(next: Exclude<ConsentChoice, "unknown">) {
    updateConsent(next); setIsVisible(false); setCustomize(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }
  if (!isVisible) return null;
  return (
    <div ref={bannerRef} role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-description"
      aria-modal="false" data-cookie-banner className="cookie-banner">
      <div className="cookie-copy">
        <p id="cookie-title" className="text-base font-black">הפרטיות שלכם, הבחירה שלכם</p>
        <p id="cookie-description" className="mt-1 text-sm leading-6 theme-muted">
          עוגיות חיוניות מאפשרות לאתר לפעול. מדידה ופרסום יופעלו רק לפי בחירתכם.{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4">מדיניות פרטיות</Link>
        </p>
        {choice !== "unknown" && <p className="mt-1 text-xs theme-muted">אפשר לעדכן את הבחירה בכל עת דרך תחתית האתר.</p>}
      </div>
      {customize && <fieldset className="cookie-preferences">
        <legend className="font-bold">התאמה אישית של העדפות</legend>
        <p className="mt-2 text-sm theme-muted">עוגיות חיוניות פעילות תמיד ונדרשות לתפעול האתר.</p>
        <label><span><strong>מדידת שימוש</strong><small>הבנת השימוש באתר באמצעות Google Analytics.</small></span>
          <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /></label>
        <label><span><strong>פרסום</strong><small>מדידת פרסום והתאמה אישית באמצעות Google ו־Meta.</small></span>
          <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} /></label>
        <button type="button" className="btn-primary inline-flex w-full" onClick={() => choose(analytics ? marketing ? "accepted" : "analytics" : marketing ? "marketing" : "rejected")}>
          שמירת ההעדפות
        </button>
      </fieldset>}
      <div className="cookie-actions">
        <button ref={acceptButtonRef} type="button" onClick={() => choose("accepted")} className="btn-primary inline-flex">אישור כל העוגיות</button>
        <button type="button" onClick={() => choose("rejected")} className="cookie-reject">דחיית עוגיות לא הכרחיות</button>
        <button type="button" aria-expanded={customize} onClick={() => setCustomize(value => !value)} className="cookie-customize">התאמה אישית</button>
      </div>
    </div>
  );
}
