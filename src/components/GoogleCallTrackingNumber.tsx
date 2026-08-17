import type { ReactNode } from "react";
import { businessConfig } from "@/config/business";
import { GOOGLE_CALL_CONVERSION_NUMBER_CLASS } from "@/lib/google-call-tracking";

type GoogleCallTrackingNumberProps = {
  children?: ReactNode;
};

export function GoogleCallTrackingNumber({
  children = businessConfig.phoneDisplay,
}: GoogleCallTrackingNumberProps) {
  const originalNumber = String(children);

  return (
    <span
      className={GOOGLE_CALL_CONVERSION_NUMBER_CLASS}
      data-google-call-original-number={originalNumber}
    >
      {children}
    </span>
  );
}
