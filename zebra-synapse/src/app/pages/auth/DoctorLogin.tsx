import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { getAuthRequestErrorMessage, getSignInErrorMessage } from "../../../lib/authErrors";
import { getAuthEmailRedirectUrl, getSupabase, isSupabaseConfigured } from "../../../lib/supabase";
import AuthExperienceShell from "../../components/auth/AuthExperienceShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  portalInputClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";

export default function DoctorLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showConfirmReminder = searchParams.get("confirm") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    const emailTrimmed = email.trim();
    setSubmitting(true);
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });
      if (error) {
        toast.error(getSignInErrorMessage(error));
        return;
      }

      const user = data.user;
      if (!user) {
        toast.error("Could not load user.");
        return;
      }

      const { data: row, error: profErr } = await sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) {
        toast.error(profErr.message);
        return;
      }
      if (!row) {
        toast.error("No profile found. Run the SQL migration in Supabase.");
        await sb.auth.signOut();
        return;
      }
      if (row.role === "patient") {
        await sb.auth.signOut();
        toast.error("This account is registered as a patient. Use the patient login.");
        return;
      }

      navigate("/doctor");
    } catch (error) {
      toast.error(getAuthRequestErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!isSupabaseConfigured()) {
      toast.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address first.");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    const emailRedirectTo = getAuthEmailRedirectUrl("/login/doctor");
    setResending(true);
    try {
      const { error } = await sb.auth.resend({
        type: "signup",
        email: trimmed,
        options: { emailRedirectTo },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Confirmation email sent. Check your inbox and spam.");
    } catch (error) {
      toast.error(getAuthRequestErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthExperienceShell
      title="Doctor Login"
      description="Sign in to scan linked patients, review structured biomarker trends, and move quickly from risk signal to follow-up."
      eyebrow="Clinical Access"
      icon={Stethoscope}
      iconAccent="#8fe7ff"
      onBack={() => navigate("/")}
    >
      {!isSupabaseConfigured() && (
        <p className="mb-5 rounded-[22px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Configure <code className="text-xs">.env</code> with Supabase URL and anon key to enable
          login.
        </p>
      )}
      {showConfirmReminder && (
        <p className="mb-5 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#c8d8ec]">
          You need to <strong className="text-white">confirm your email</strong> using the link we
          sent before password login will work. Check spam if you do not see it.
        </p>
      )}
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="doctor@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={portalInputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/80">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={portalInputClass}
          />
        </div>
        <Button type="submit" className={`h-12 w-full rounded-2xl ${portalPrimaryButtonClass}`} disabled={submitting}>
          {submitting ? "Signing in..." : "Login"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={`h-12 w-full rounded-2xl ${portalSecondaryButtonClass}`}
          disabled={resending}
          onClick={handleResendConfirmation}
        >
          {resending ? "Sending..." : "Resend confirmation email"}
        </Button>
        <div className="text-center text-sm text-[#92a8c7]">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup/doctor")}
            className="font-medium text-[#8fe7ff] transition hover:text-white hover:underline"
          >
            Sign up
          </button>
        </div>
      </form>
    </AuthExperienceShell>
  );
}
