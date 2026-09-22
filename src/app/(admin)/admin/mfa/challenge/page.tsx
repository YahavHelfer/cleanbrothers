import { requireCmsOnboardingPage } from "@/cms/onboarding";
import { AuthPanel } from "../../AuthPanel";
import { VerifyForm } from "../VerifyForm";

export const dynamic = "force-dynamic";
export default async function MfaChallengePage() {
  const member = await requireCmsOnboardingPage("mfa-challenge");
  const factor = member.factors.find(({ status }) => status === "verified") ?? member.factors[0];
  return <AuthPanel title="אימות דו־שלבי">
    <p>הקלידו את הקוד שמופיע באפליקציית המאמת כדי להיכנס לניהול האתר.</p>
    <VerifyForm factorId={factor.id} />
    <p className="theme-muted">אין גישה למאמת, או שהסריקה לא הושלמה? פנו לאחראי המערכת. נדרש אימות זהות לפני איפוס מבוקר.</p>
  </AuthPanel>;
}
