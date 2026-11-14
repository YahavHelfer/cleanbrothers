import Image from "next/image";
import Link from "next/link";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getWhatsAppLink } from "@/lib/whatsapp";

const trustChips = [
  "לבית, לעסק ולרכב",
  "שירות עד הבית",
  "הערכת מחיר לפי תמונה",
];

const mascotAlt = "איור של צוות CleanBrothers";

export const heroContent = {
  eyebrow: "CleanBrothers • שירותי ניקיון מקצועיים",
  title: "ניקיון מקצועי לבית, לעסק ולרכב",
  description: "ניקוי ספות, מזרנים, שטיחים, ריפודי רכב, מזגנים וחלונות — עם שירות מקצועי עד אליכם.",
  primaryLabel: "שלחו תמונה וקבלו הערכת מחיר",
  secondaryLabel: "צפו בכל השירותים",
  trustChips,
  backgroundAlt: "ניקוי ספה מקצועי בבית הלקוח",
};

export function Hero({ content = heroContent, backgroundSrc = "/images/hero/hero-sofa-cleaning.jpg", preview = false }: {
  content?: typeof heroContent; backgroundSrc?: string; preview?: boolean;
} = {}) {
  return (
    <section className="premium-hero relative overflow-hidden">
      <div aria-hidden="true" className="hero-orbit" />
      <div className="section-container premium-hero-grid">
        <div className="hero-copy">
          <p className="hero-eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="hero-description">{content.description}</p>
          <div className="hero-actions">
            {preview ? <span className="btn-whatsapp inline-flex" aria-disabled="true">{content.primaryLabel}</span> :
              <a data-whatsapp-location="hero" href={getWhatsAppLink()} className="btn-whatsapp inline-flex">{content.primaryLabel}<span aria-hidden="true">↗</span></a>}
            {preview ? <span className="btn-secondary inline-flex" aria-disabled="true">{content.secondaryLabel}</span> :
              <Link href="/services" className="btn-secondary inline-flex">{content.secondaryLabel}</Link>}
          </div>
          <ul className="hero-trust">{content.trustChips.map(item => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
        </div>
        <div className="hero-art">
          <ImageWithFallback src={backgroundSrc} alt={content.backgroundAlt} className="hero-service-photo"
            imageClassName="object-cover object-center" fallbackClassName="from-surface-soft to-white" fetchPriority="high"
            sizes="(min-width: 1024px) 48vw, (min-width: 640px) 70vw, 90vw" />
          <div className="hero-mascot"><Image src="/images/mascots/cleanbrothers-mascots.png" alt={mascotAlt}
            width={1536} height={1024} className="mascot-render-safe h-auto w-full" sizes="(min-width: 1024px) 270px, 130px" /></div>
          <div className="hero-photo-label"><span aria-hidden="true">✦</span> CleanBrothers</div>
        </div>
      </div>
    </section>
  );
}
