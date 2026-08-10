import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getSupabase } from "../../lib/supabase";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Copy, Check, ShieldCheck, UserCircle2, KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
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
      {/* Sleek Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
            <UserCircle2 className="h-6 w-6 text-[#ff9c61]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Account Settings</h1>
              <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                {profile.role}
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
              Manage your display name, physician connection ID, and portal identity preferences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
      </div>

      {/* Vertical Stacked Cards Layout */}
      <div className="space-y-6 max-w-4xl">
        {/* Left Card: Profile Information */}
        <Card className={`${portalPanelClass} p-2`}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4.5 w-4.5 text-[#ff9c61]" />
              <CardTitle className="text-base text-white">Profile Information</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#92a8c7]">
              Update your display name and credentials used across the portal.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Display Name
                </Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={portalInputClass}
                />
              </div>

              {profile.role === "doctor" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="license" className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Medical License Number
                  </Label>
                  <Input
                    id="license"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="License number"
                    className={portalInputClass}
                  />
                </div>
              ) : null}

              <div className="pt-2">
                <Button type="submit" disabled={saving} className={`w-full h-11 rounded-xl ${portalPrimaryButtonClass}`}>
                  {saving ? "Saving Changes…" : "Save Profile Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Card: Security & Physician Connection ID */}
        <Card className={`${portalPanelClass} p-2`}>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-4.5 w-4.5 text-sky-400" />
              <CardTitle className="text-base text-white">Security & Connection ID</CardTitle>
            </div>
            <CardDescription className="text-xs text-[#92a8c7]">
              {profile.role === "patient"
                ? "Share this unique Profile ID with your physician to link your records."
                : "Your unique system identification code."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Your Connection Profile ID
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-white/10 bg-[#090e17] px-3.5 py-2.5 text-xs font-mono text-[#E5E7EB]">
                  {user.id}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`${portalSecondaryButtonClass} h-10 px-4 shrink-0 rounded-xl text-xs`}
                  onClick={() => void copyId()}
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? "Copied" : "Copy ID"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/12">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#93c5fd]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Portal Identity & Privacy</p>
                  <p className="mt-0.5 text-[11px] text-[#92a8c7] leading-relaxed">
                    Your profile details are encrypted end-to-end and synced securely across patient and doctor workspaces.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PatientPortalPage>
  );
}
