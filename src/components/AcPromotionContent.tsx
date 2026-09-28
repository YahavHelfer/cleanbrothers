import type { AirConditionerCleaningContent } from "@/cms/content/special-model";
// Pure presentation: no timer, storage, campaign events or form submission.
export function AcPromotionContent({promotion, preview = false, whatsappHref, onContact}: {promotion: AirConditionerCleaningContent["promotion"]; preview?: boolean; whatsappHref?: string; onContact?: () => void}) {
 return (        <div className="pr-0 text-center sm:px-3">
          <p className="inline-flex rounded-full border border-turquoise/25 bg-turquoise/10 px-3 py-1.5 text-xs font-black text-turquoise-dark sm:text-sm">
            {promotion.badge}
          </p>
          <h2
            id="summer-ac-promotion-title"
            className="mx-auto mt-3 max-w-md text-3xl font-black leading-tight sm:text-4xl"
          >
            {promotion.pricePrefix}<span className="text-turquoise-dark">{promotion.startingPrice} ₪</span>
          </h2>
          <p className="mt-1.5 text-sm font-bold theme-muted">
            במקום <span className="line-through decoration-2">{promotion.regularPrice} ₪</span>
          </p>

          {promotion.bundleEnabled && <div className="mt-4 rounded-2xl border border-turquoise/25 bg-turquoise/[0.08] px-4 py-3 sm:mt-5">
            <p className="text-lg font-black sm:text-xl">
              מנקים 5 מזגנים — המזגן ה־6 עלינו!
            </p>
          </div>}

          <p
            id="summer-ac-promotion-description"
            className="mx-auto mt-4 max-w-md text-sm leading-6 theme-muted sm:text-base sm:leading-7"
          >
            {promotion.description}
          </p>

          <a
            href={preview ? undefined : whatsappHref} aria-disabled={preview || undefined}
            target="_blank"
            rel="noreferrer"
            onClick={onContact}
            className="btn-primary mt-4 inline-flex min-h-12 w-full px-5 text-base sm:mt-5"
          >
            {promotion.cta}
          </a>

          <p className="mt-4 text-right text-[0.7rem] leading-5 theme-muted sm:text-xs">
            {promotion.priceTerms}{promotion.enabled && promotion.bundleEnabled ? ` ${promotion.bundleTerms}` : ""}
          </p>
        </div>);
}
