import { businessConfig } from "@/config/business";
import { getWhatsAppMessage, resolveWhatsAppService } from "./whatsapp-messages";

export function getWhatsAppLink(message: string = businessConfig.whatsappDefaultMessage, pathname = "/") {
  if (!businessConfig.whatsappPhone) {
    return "/contact";
  }

  const service = resolveWhatsAppService(pathname, message);
  return buildDirectWhatsAppLink(getWhatsAppMessage(service));
}

export function buildDirectWhatsAppLink(
  message: string = businessConfig.whatsappDefaultMessage,
) {
  if (!businessConfig.whatsappPhone) {
    return "/contact";
  }

  return `https://wa.me/${businessConfig.whatsappPhone}?text=${encodeURIComponent(
    message,
  )}`;
}
