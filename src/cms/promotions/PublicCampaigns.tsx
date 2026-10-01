"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { resolveSafeTarget } from "@/cms/pages/model";
import { validatePublicCampaign, type PublicCampaign } from "./model";
import { PromotionPopupView } from "./PromotionPopupView";

type ActivePublicCampaign = { path: string; revisionId: string; campaign: PublicCampaign };
export function PublicCampaigns() {
  const pathname = usePathname();
  const [current, setCurrent] = useState<ActivePublicCampaign | null>(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(`/api/cms/public-promotion?path=${encodeURIComponent(pathname)}`, { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        try {
          if (typeof data.revisionId !== "string" || !/^[0-9a-f-]{36}$/.test(data.revisionId)) return;
          setCurrent({ path: pathname, revisionId: data.revisionId, campaign: validatePublicCampaign(data.campaign) });
        } catch { /* Optional campaign fails soft. */ }
      }).catch(() => {});
    return () => { cancelled = true; controller.abort(); };
  }, [pathname]);
  if (!current || current.path !== pathname) return null;
  const { campaign, revisionId } = current;
  if (campaign.displayMode === "popup") return <PromotionPopupView key={revisionId} campaign={campaign} revisionId={revisionId} />;
  const href = resolveSafeTarget(campaign.cta.target);
  return <aside className="section-block theme-section-contrast" data-promotion-revision={revisionId}>
    <div className="section-container grid gap-3 rounded-2xl border theme-card p-6 text-center">
      <span className="text-sm font-bold">{campaign.badgeText}</span><h2 className="text-2xl font-black">{campaign.h1}</h2>
      <p>{campaign.description}</p>{campaign.showPrice && <p className="text-xl font-black">{campaign.currentPrice} ₪</p>}
      {href && <a className="btn-primary justify-self-center" href={href}>{campaign.cta.label}</a>}
      <small>{campaign.terms}</small>
    </div>
  </aside>;
}
