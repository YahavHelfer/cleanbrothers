import { WindowCleaningView } from "./WindowCleaningView";
import { ContactForm } from "./ContactForm";
import { GoogleCallTrackingNumber } from "./GoogleCallTrackingNumber";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { serviceRegistry } from "@/content/service-registry";
import type { WindowCleaningContent } from "@/cms/content/special-model";
import type { ResolvedMedia } from "@/cms/media/model";
import { windowBaseline } from "@/cms/content/special-baseline";
export function WindowCleaningLandingPage({content = windowBaseline, media}:{content?:WindowCleaningContent;media?:ResolvedMedia[]}) {
 return <WindowCleaningView content={content} media={media} contact={<ContactForm initialService={serviceRegistry["window-cleaning"].crmName} />} phone={<GoogleCallTrackingNumber>055-957-7731</GoogleCallTrackingNumber>} phoneHref="tel:0559577731" whatsappHref={getWhatsAppLink("היי, אשמח לקבל הצעת מחיר לניקוי חלונות. מצורפות תמונות של החלונות והגישה אליהם.")} />;
}
