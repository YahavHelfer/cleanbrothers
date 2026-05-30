import { businessConfig } from "@/config/business";

export function getWhatsAppLink(message = businessConfig.whatsappDefaultMessage) {
  if (!businessConfig.whatsappPhone) {
    return "/contact";
  }

  return `https://wa.me/${businessConfig.whatsappPhone}?text=${encodeURIComponent(
    message,
  )}`;
}
