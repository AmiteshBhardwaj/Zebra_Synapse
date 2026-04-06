import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getSupabase } from "../../lib/supabase";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Copy, Check, ShieldCheck, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  PatientPageHero,
  PatientPortalPage,
  portalInputClass,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
} from "../components/patient/PortalTheme";

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
      <PatientPortalPage>
        <p className="text-sm text-[#A1A1AA]">Loading...</p>
      </PatientPortalPage>
    );
  }

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Account Controls"
        title="Account settings"
        description={`Update how your name appears in the portal${profile.role === "doctor" ? " and keep your license details current" : ""} without leaving the shared dark workspace.`}
        icon={UserCircle2}
        meta={[
          { label: "Profile Role", value: profile.role },
          { label: "Sync Status", value: "Connected" },
          { label: "Profile ID", value: copied ? "Copied" : "Available" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className={portalPanelClass}>
          <CardHeader>
            <CardTitle className="text-base text-white">Your profile ID</CardTitle>
            <CardDescription className="text-[#A1A1AA]">
              {profile.role === "patient"
                ? "Share this with your doctor so they can link your account in My Patients."
                : "Your unique id in the system (same as your auth user id)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl border border-white/10 bg-[#111111] px-3 py-3 text-xs text-[#E5E7EB]">
              {user.id}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={portalSecondaryButtonClass}
              onClick={() => void copyId()}
            >
              {copied ? (
                <Check className="w-4 h-4 mr-1" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              Copy
            </Button>
          </CardContent>
        </Card>

        <div className={`${portalPanelClass} p-6`}>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">Privacy & Identity</p>
            <h2 className="text-xl font-semibold text-white">Account visibility</h2>
            <p className="text-sm leading-7 text-[#A1A1AA]">
              Settings stay intentionally focused so your identity details are easy to confirm in one place.
            </p>
          </div>
          <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-[#111111]/80 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3B82F6]/20 bg-[#3B82F6]/12">
                <ShieldCheck className="h-5 w-5 text-[#93c5fd]" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Portal identity</p>
                <p className="mt-2 text-sm leading-7 text-[#D4D4D8]">
                  Your saved profile details are used across the patient and doctor experiences without changing any account permissions here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className={`${portalPanelClass} max-w-3xl`}>
        <CardHeader>
          <CardTitle className="text-base text-white">Profile</CardTitle>
          <CardDescription className="text-[#A1A1AA]">
            Update the fields below and keep the presentation aligned across the portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-white">
                Display name
              </Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className={portalInputClass}
              />
            </div>
            {profile.role === "doctor" ? (
              <div className="space-y-2">
                <Label htmlFor="license" className="text-white">
                  License number
                </Label>
                <Input
                  id="license"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Medical license"
                  className={portalInputClass}
                />
              </div>
            ) : null}
            <Button type="submit" disabled={saving} className={portalPrimaryButtonClass}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PatientPortalPage>
  );
}
