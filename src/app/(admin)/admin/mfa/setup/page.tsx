import { requireCmsOnboardingPage } from "@/cms/onboarding";
import { AuthPanel } from "../../AuthPanel";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";
export default async function MfaSetupPage() {
  await requireCmsOnboardingPage("mfa-setup");
  return <AuthPanel title="הגדרת אימות דו־שלבי"><SetupForm /></AuthPanel>;
}
