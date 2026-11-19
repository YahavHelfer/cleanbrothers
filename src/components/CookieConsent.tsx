"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getStoredConsent, subscribeToConsentChanges, subscribeToConsentPreferenceRequests,
  updateConsent, type ConsentChoice } from "@/lib/consent";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const preferenceHeadingRef = useRef<HTMLLegendElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function restore(next: ConsentChoice) {
      setAnalytics(next === "accepted" || next === "analytics");
      setMarketing(next === "accepted" || next === "marketing");
    }
    const timeout = window.setTimeout(() => {
      const stored = getStoredConsent(); restore(stored); setIsVisible(stored === "unknown");
    }, 0);
    const unsubscribe = subscribeToConsentChanges(restore);
    const preferences = subscribeToConsentPreferenceRequests(() => {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setIsVisible(true); setCustomize(true);

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

  useEffect(() => {
    if (isVisible && customize) preferenceHeadingRef.current?.focus();
  }, [isVisible, customize]);

  function choose(next: Exclude<ConsentChoice, "unknown">) {
    updateConsent(next); setIsVisible(false); setCustomize(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  }
  if (!isVisible) return null;
  return (
    <div ref={bannerRef} role="dialog" aria-label="העדפות עוגיות" aria-modal="false"
      data-cookie-banner className="cookie-banner" data-customize={customize}>
      {customize ? <fieldset id="cookie-preferences" className="cookie-preferences">
        <legend ref={preferenceHeadingRef} tabIndex={-1} className="font-bold">הגדרות עוגיות</legend>
        <p className="mt-2 text-sm theme-muted">עוגיות הכרחיות פעילות תמיד. אפשר לבחור אילו עוגיות נוספות להפעיל.</p>
        <label><span><strong>מדידת שימוש</strong><small>הבנת השימוש באתר באמצעות Google Analytics.</small></span>
          <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /></label>
        <label><span><strong>פרסום</strong><small>מדידת פרסום והתאמה אישית באמצעות Google ו־Meta.</small></span>
          <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} /></label>
        <div className="cookie-preference-actions">
          <button type="button" className="btn-primary" onClick={() => choose(analytics ? marketing ? "accepted" : "analytics" : marketing ? "marketing" : "rejected")}>
            שמירת ההעדפות
          </button>
          <button type="button" className="cookie-essential" onClick={() => choose("rejected")}>רק עוגיות הכרחיות</button>
        </div>
      </fieldset> : <>
        <div>
          <p id="cookie-description">בלחיצה על ״הבנתי״ אתם מאשרים עוגיות למדידת השימוש באתר ולפרסום מותאם אישית.</p>
          <div className="cookie-links">
            <a href="#cookie-preferences" onClick={event => { event.preventDefault(); setCustomize(true); }}>הגדרות עוגיות</a>
            <Link href="/privacy-policy">מדיניות פרטיות</Link>
          </div>
        </div>
        <button type="button" className="cookie-ack" aria-describedby="cookie-description" onClick={() => choose("accepted")}>הבנתי</button>
      </>}
    </div>
  );
}
