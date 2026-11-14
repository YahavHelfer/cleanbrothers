import type { ReactNode } from "react";

export function ServiceHero({ title, eyebrow, breadcrumbs, actions, media, badge, summary }: {
  title: ReactNode; eyebrow: string; breadcrumbs: ReactNode;
  actions: ReactNode; media?: ReactNode; badge?: ReactNode; summary?: string;
}) {
  return (
    <section className={`service-hero ${media ? "service-hero-with-media" : ""}`}>
      <div className="section-container">
        <div className="service-breadcrumbs">{breadcrumbs}</div>
        <div className="service-hero-grid">
          <div className="service-hero-copy">
            <p className="service-hero-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="service-hero-summary">{summary || "שלחו תמונה ונעזור להתאים את השירות לצורך שלכם."}</p>
            {badge && <div className="service-hero-badge">{badge}</div>}
            <div className="service-hero-actions">{actions}</div>
          </div>
          {media && <div className="service-hero-media">{media}</div>}
        </div>
      </div>
    </section>
  );
}

export function ServiceIntroduction({ text, children, links }: {
  text: string; children?: ReactNode; links?: ReactNode;
}) {
  return (
    <section className="service-introduction" aria-label="מידע נוסף על השירות">
      <div className="section-container">
        <div className="service-introduction-copy"><p>{text}</p>{children}</div>
        {links && <details className="service-further-links"><summary>מידע נוסף וקישורים</summary><div>{links}</div></details>}
      </div>
    </section>
  );
}
