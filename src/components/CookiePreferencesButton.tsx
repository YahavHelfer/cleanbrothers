"use client";

import { requestConsentPreferences } from "@/lib/consent";

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={requestConsentPreferences}
      className="transition hover:text-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise"
    >
      ניהול העדפות עוגיות
    </button>
  );
}
