"use server";

import { redirect } from "next/navigation";
import { verifyCmsAdmin, verifyCmsMemberForOnboarding } from "@/cms/authorization";
import { isStrongCmsPassword } from "@/cms/invitation";
import { cmsStepDestination } from "@/cms/onboarding";
import { clearCmsCookies, createCmsServerClient } from "@/cms/server";

type FormState = { error: string };
type EnrollmentState = FormState & { factorId?: string; qrCode?: string };
const mfaError = "לא ניתן להשלים את האימות. בדקו את הקוד באפליקציית המאמת ונסו שוב.";
const passwordError = "לא ניתן להגדיר את הסיסמה. בדקו שהפרטים תקינים ושההזמנה עדיין זמינה.";

export async function enrollCmsTotp(): Promise<EnrollmentState> {
  try {
    const client = await createCmsServerClient(true);
    const member = await verifyCmsMemberForOnboarding(client);
    if (member.step !== "mfa-setup" || member.factors.length) return { error: mfaError };
    const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", issuer: "CleanBrothers CMS" });
    if (error || !data || !data.totp.qr_code.startsWith("data:image/svg+xml;")) return { error: mfaError };
    // Only the QR needed by this user leaves the server; no secret/URI, storage,
    // log, analytics, image optimizer, or dangerouslySetInnerHTML is involved.
    return { error: "", factorId: data.id, qrCode: data.totp.qr_code };
  } catch {
    return { error: mfaError };
  }
}

export async function verifyCmsTotp(_previous: FormState, formData: FormData): Promise<FormState> {
  const factorId = formData.get("factorId");
  const code = formData.get("code");
  if (typeof factorId !== "string" || typeof code !== "string" || !/^[0-9]{6}$/.test(code)) return { error: mfaError };
  try {
    const client = await createCmsServerClient(true);
    const member = await verifyCmsMemberForOnboarding(client);
    if (member.step !== "mfa-challenge" || !member.factors.some((factor) => factor.id === factorId) ||
        (member.factors.some((factor) => factor.status === "verified") &&
         !member.factors.some((factor) => factor.id === factorId && factor.status === "verified"))) return { error: mfaError };
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return { error: mfaError };
    // Auth just replaced the session; verify fresh signed claims + membership
    // and AAL2 RLS before granting anything, not a success flag from the UI.
    await verifyCmsAdmin(client);
  } catch {
    return { error: mfaError };
  }
  redirect("/admin");
}

export async function setCmsInitialPassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const password = formData.get("password");
  if (!isStrongCmsPassword(password) || formData.get("confirmPassword") !== password) return { error: passwordError };
  let destination: string;
  try {
    const client = await createCmsServerClient(true);
    const member = await verifyCmsMemberForOnboarding(client);
    if (member.step !== "password" || !member.email) return { error: passwordError };
    const { error } = await client.auth.updateUser({ password });
    if (error) return { error: passwordError };
    // End the invite refresh session and establish ordinary password auth.
    // A fresh signed password claim is required to complete DB onboarding.
    await client.auth.signOut({ scope: "local" });
    const signedIn = await client.auth.signInWithPassword({ email: member.email, password });
    if (signedIn.error) {
      await clearCmsCookies();
      return { error: "הסיסמה נשמרה. היכנסו מחדש כדי להמשיך לאימות דו־שלבי." };
    }
    const completed = await client.rpc("complete_cms_initial_password_setup");
    if (completed.error || completed.data !== true) return { error: passwordError };
    destination = cmsStepDestination((await verifyCmsMemberForOnboarding(client)).step);
  } catch {
    return { error: passwordError };
  }
  redirect(destination);
}
