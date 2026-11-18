import Image from "next/image";
import Link from "next/link";
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

export function Hero({ content = heroContent, preview = false }: {
  content?: typeof heroContent; preview?: boolean;
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
          <Image
            src="/images/mascots/cleanbrothers-mascots.png"
            alt={mascotAlt}
            width={1536}
            height={1024}
            quality={90}
            className="hero-mascot mascot-render-safe h-auto"
            sizes="(max-width: 639px) 240px, 368px"
          />
        </div>
      </div>
    </section>
  );
}
