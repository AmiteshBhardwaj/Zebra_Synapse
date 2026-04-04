import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { getSupabase, isSupabaseConfigured } from "../../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, Stethoscope } from "lucide-react";

export default function DoctorSignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    licenseNumber: "",
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
    if (!isSupabaseConfigured()) {
      toast.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    const email = formData.email.trim();
    setSubmitting(true);
    const { data, error } = await sb.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          role: "doctor",
          full_name: formData.name,
          license_number: formData.licenseNumber,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      toast.success("Account created.");
      navigate("/doctor");
    } else {
      toast.success("Check your email to confirm your account, then sign in.");
      navigate("/login/doctor?confirm=1");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-muted flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              </div>
            </div>
            <CardTitle>Doctor Sign Up</CardTitle>
            <CardDescription>Create your account to start managing patients</CardDescription>
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured() && (
              <p className="text-sm text-amber-600 dark:text-amber-500 mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                Configure <code className="text-xs">.env</code> with Supabase URL and anon key first.
              </p>
            )}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">Medical License Number</Label>
                <Input
                  id="licenseNumber"
                  type="text"
                  placeholder="MD123456"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account…" : "Create Account"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login/doctor")}
                  className="text-primary hover:underline"
                >
                  Login
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
