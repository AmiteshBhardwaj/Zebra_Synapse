import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getSupabase } from "../../lib/supabase";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setLicenseNumber(profile.license_number ?? "");
    }
  }, [profile]);

  const copyId = async () => {
    const id = user?.id;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success("Profile ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    const uid = user?.id;
    if (!sb || !uid || !profile) {
      toast.error("Not signed in");
      return;
    }
    setSaving(true);
    const patch: Record<string, string | null> = {
      full_name: fullName.trim() || null,
    };
    if (profile.role === "doctor") {
      patch.license_number = licenseNumber.trim() || null;
    }
    const { error } = await sb.from("profiles").update(patch).eq("id", uid);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile saved");
  };

  if (!profile || !user) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading…</div>
    );
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl text-foreground mb-2">Account settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Update how your name appears in the portal
        {profile.role === "doctor" ? " and your license number" : ""}.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Your profile ID</CardTitle>
          <CardDescription>
            {profile.role === "patient"
              ? "Share this with your doctor so they can link your account in My Patients."
              : "Your unique id in the system (same as your auth user id)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="text-xs bg-muted px-2 py-1.5 rounded break-all flex-1">
            {user.id}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={() => void copyId()}>
            {copied ? (
              <Check className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            Copy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Display name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            {profile.role === "doctor" ? (
              <div className="space-y-2">
                <Label htmlFor="license">License number</Label>
                <Input
                  id="license"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Medical license"
                />
              </div>
            ) : null}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
