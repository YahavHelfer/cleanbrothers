"use server";

import { redirect } from "next/navigation";
import { verifyCmsAdmin } from "@/cms/authorization";
import { clearCmsCookies, createCmsServerClient } from "@/cms/server";

type LoginState = { error: string };
const loginError = "לא ניתן להיכנס למערכת עם הפרטים שנמסרו. בדקו את הפרטים ונסו שוב.";

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 1 || password.length > 1024) {
    return { error: loginError };
  }
  try {
    const client = await createCmsServerClient(true);
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      await clearCmsCookies();
      return { error: loginError };
    }
    try {
      await verifyCmsAdmin(client);
    } catch {
      await client.auth.signOut({ scope: "local" });
      await clearCmsCookies();
      return { error: loginError };
    }
  } catch {
    await clearCmsCookies();
    return { error: loginError };
  }
  // Fixed destination only; no returnTo/next input is accepted.
  redirect("/admin");
}

export async function logout() {
  try {
    const client = await createCmsServerClient(true);
    await client.auth.signOut({ scope: "local" });
  } catch {
    // Local logout still succeeds when Auth is temporarily unavailable.
  } finally {
    await clearCmsCookies();
  }
  redirect("/admin/login");
}
