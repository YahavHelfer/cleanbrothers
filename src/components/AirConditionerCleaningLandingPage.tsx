import { AirConditionerCleaningView } from "./AirConditionerCleaningView";
import { ContactForm } from "./ContactForm";
import { GoogleCallTrackingNumber } from "./GoogleCallTrackingNumber";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { serviceRegistry } from "@/content/service-registry";
import type { AirConditionerCleaningContent } from "@/cms/content/special-model";
import type { ResolvedMedia } from "@/cms/media/model";
import { acBaseline } from "@/cms/content/special-baseline";
import { SummerAcPromotionPopup } from "./SummerAcPromotionPopup";
export function AirConditionerCleaningLandingPage({content = acBaseline, media}:{content?:AirConditionerCleaningContent;media?:ResolvedMedia[]}) {
 return <AirConditionerCleaningView content={content} media={media} contact={<ContactForm initialService={serviceRegistry["air-conditioner-cleaning"].crmName} />} phone={<GoogleCallTrackingNumber />} phoneHref="tel:0559577731" whatsappHref={getWhatsAppLink("היי, אשמח לשלוח תמונה של המזגן ולקבל הערכת מחיר לניקוי מזגן.")} popup={content.promotion.enabled ? <SummerAcPromotionPopup promotion={content.promotion} /> : null} multipleUnitsHref={getWhatsAppLink("היי, יש לי כמה מזגנים בבית. אשמח לשלוח את כל התמונות ולקבל הערכה מרוכזת.")} />;
}
