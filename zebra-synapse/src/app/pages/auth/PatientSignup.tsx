import { useState } from "react";
import { useNavigate } from "react-router";
import { User } from "lucide-react";
import { toast } from "sonner";
import { getAuthRequestErrorMessage } from "../../../lib/authErrors";
import { getAuthEmailRedirectUrl, getSupabase, isSupabaseConfigured } from "../../../lib/supabase";
import { getPasswordPolicyError } from "../../../lib/security";
import AuthExperienceShell from "../../components/auth/AuthExperienceShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { portalInputClass, portalPrimaryButtonClass } from "../../components/patient/PortalTheme";

export default function PatientSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const passwordError = getPasswordPolicyError(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    const email = formData.email.trim();
    const emailRedirectTo = getAuthEmailRedirectUrl("/login/patient");
    setSubmitting(true);
    try {
      const { data, error } = await sb.auth.signUp({
        email,
        password: formData.password,
        options: {
          emailRedirectTo,
          data: {
            role: "patient",
            full_name: formData.name,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        toast.success("Account created.");
        navigate("/patient");
      } else {
        toast.success("Check your email to confirm your account, then sign in.");
        navigate("/login/patient?confirm=1");
      }
    } catch (error) {
      toast.error(getAuthRequestErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthExperienceShell
      title="Patient Sign Up"
      description="Create your patient workspace to upload lab reports, unlock structured insights, and keep your follow-up plan in one place."
      eyebrow="Patient Access"
      icon={User}
      iconAccent="#ffb17e"
      onBack={() => navigate("/")}
    >
      {!isSupabaseConfigured() && (
        <p className="mb-5 rounded-[22px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Configure <code className="text-xs">.env</code> with Supabase URL and anon key first.
        </p>
      )}
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white/80">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoComplete="name"
            className={portalInputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="patient@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            autoComplete="email"
            className={portalInputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 12 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              autoComplete="new-password"
              minLength={12}
              className={portalInputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white/80">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
              className={portalInputClass}
            />
          </div>
        </div>
        <Button type="submit" className={`h-12 w-full rounded-2xl ${portalPrimaryButtonClass}`} disabled={submitting}>
          {submitting ? "Creating account..." : "Create Account"}
        </Button>
        <div className="text-center text-sm text-[#92a8c7]">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login/patient")}
            className="font-medium text-[#8fe7ff] hover:underline"
          >
            Login
          </button>
        </div>
      </form>
    </AuthExperienceShell>
  );
}
