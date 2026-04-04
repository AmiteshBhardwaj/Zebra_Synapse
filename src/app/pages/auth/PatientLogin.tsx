import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { getSupabase, isSupabaseConfigured } from "../../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, User } from "lucide-react";

export default function PatientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    setSubmitting(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      toast.error("Could not load user.");
      setSubmitting(false);
      return;
    }

    const { data: row, error: profErr } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      toast.error(profErr.message);
      setSubmitting(false);
      return;
    }
    if (!row) {
      toast.error("No profile found. Run the SQL migration in Supabase.");
      await sb.auth.signOut();
      setSubmitting(false);
      return;
    }
    if (row.role === "doctor") {
      await sb.auth.signOut();
      toast.error("This account is registered as a doctor. Use the doctor login.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    navigate("/patient");
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
                <User className="w-6 h-6 text-foreground" strokeWidth={1.5} />
              </div>
            </div>
            <CardTitle>Patient Login</CardTitle>
            <CardDescription>Enter your credentials to access your health dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured() && (
              <p className="text-sm text-amber-600 dark:text-amber-500 mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                Configure <code className="text-xs">.env</code> with Supabase URL and anon key to
                enable login.
              </p>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Login"}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/signup/patient")}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
