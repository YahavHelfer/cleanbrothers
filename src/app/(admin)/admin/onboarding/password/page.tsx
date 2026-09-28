import { requireCmsOnboardingPage } from "@/cms/onboarding";
import { AuthPanel } from "../../AuthPanel";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";
export default async function PasswordSetupPage() {
  await requireCmsOnboardingPage("password");
  return <AuthPanel title="הגדרת סיסמה ראשונה"><PasswordForm /><p className="theme-muted">לאחר שמירת הסיסמה יש להגדיר אימות דו־שלבי.</p></AuthPanel>;
}
