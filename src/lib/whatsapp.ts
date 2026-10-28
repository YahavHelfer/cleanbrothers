import { businessConfig } from "@/config/business";

export function getWhatsAppLink(message = businessConfig.whatsappDefaultMessage) {
  // A direct link avoids the website's intermediate attribution redirect.
  // BusinessEventTracker recognizes wa.me links and still records click_whatsapp.
  return buildDirectWhatsAppLink(message);
}

export function buildDirectWhatsAppLink(
  message = businessConfig.whatsappDefaultMessage,
) {
  if (!businessConfig.whatsappPhone) {
    return "/contact";
  }

  return `https://wa.me/${businessConfig.whatsappPhone}?text=${encodeURIComponent(
    message,
  )}`;
}
