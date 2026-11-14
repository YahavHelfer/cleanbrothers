"use client";

import { usePathname } from "next/navigation";
import { ContactAvatar } from "@/components/ContactAvatar";

// One branded contact launcher on every public page. Changing page resets the
// panel and uses the same centralized service-aware WhatsApp link contract.
export function WhatsAppButton({ chatEnabled = false }: { chatEnabled?: boolean }) {
  const pathname = usePathname();
  return <ContactAvatar key={pathname} pathname={pathname} chatEnabled={chatEnabled} />;
}
