import type { AuthError } from "@supabase/supabase-js";

/** User-facing copy for Supabase password sign-in failures. */
export function getSignInErrorMessage(error: AuthError): string {
  const code = error.code ?? "";
  const msg = error.message.toLowerCase();

  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Your email is not confirmed yet. Open the link in the message we sent you (check spam), then sign in.";
  }

  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
    return "Invalid email or password. If you created the account recently, confirm your email first using the link from Supabase, then try again.";
  }

  return error.message;
}
