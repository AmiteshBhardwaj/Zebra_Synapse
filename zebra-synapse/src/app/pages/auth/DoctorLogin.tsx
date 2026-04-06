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
      description="Access your patient management dashboard, review biomarker trends, and deliver AI-assisted care with confidence."
      eyebrow="Clinical Access"
      icon={Stethoscope}
      iconAccent="#FF6000"
      onBack={() => navigate("/")}
    >
      {!isSupabaseConfigured() && (
        <p className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Configure <code className="text-xs">.env</code> with Supabase URL and anon key to enable
          login.
        </p>
      )}
      {showConfirmReminder && (
        <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          You need to <strong className="text-white">confirm your email</strong> using the link we
          sent before password login will work. Check spam if you do not see it.
        </p>
      )}
      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/78">
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
            className="h-12 rounded-2xl border-white/10 bg-white/[0.05] text-white placeholder:text-white/30 focus-visible:border-[#6C5BD4] focus-visible:ring-[rgba(108,91,212,0.45)]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/78">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-12 rounded-2xl border-white/10 bg-white/[0.05] text-white placeholder:text-white/30 focus-visible:border-[#6C5BD4] focus-visible:ring-[rgba(108,91,212,0.45)]"
          />
        </div>
        <Button
          type="submit"
          className="h-12 w-full rounded-2xl border-0 bg-[linear-gradient(135deg,#6C5BD4_0%,#FF6000_100%)] text-white shadow-[0_18px_40px_rgba(108,91,212,0.22)] transition duration-300 hover:brightness-110"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Login"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-2xl border-white/12 bg-black/20 text-white/80 transition duration-300 hover:bg-white/[0.06] hover:text-white"
          disabled={resending}
          onClick={handleResendConfirmation}
        >
          {resending ? "Sending..." : "Resend confirmation email"}
        </Button>
        <div className="text-center text-sm text-white/58">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup/doctor")}
            className="font-medium text-[#ffb788] transition hover:text-white hover:underline"
          >
            Sign up
          </button>
        </div>
      </form>
    </AuthExperienceShell>
  );
}
