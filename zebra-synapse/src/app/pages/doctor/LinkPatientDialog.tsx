import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { getSupabase } from "../../../lib/supabase";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  portalDialogClass,
  portalInputClass,
  portalPrimaryButtonClass,
  portalSecondaryButtonClass,
  portalSelectItemClass,
  portalSelectTriggerClass,
} from "../../components/patient/PortalTheme";

// Standard UUID format regex (case-insensitive 8-4-4-4-12 hex)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  onLinked: () => void;
};

export default function LinkPatientDialog({ onLinked }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [availablePatients, setAvailablePatients] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    if (!open) return;
    const sb = getSupabase();
    if (!sb || !user) return;

    let isMounted = true;
    setLoadingPatients(true);

    sb.from("profiles")
      .select("id, full_name")
      .eq("role", "patient")
      .then(({ data, error }) => {
        if (!isMounted) return;
        setLoadingPatients(false);
        if (!error && data) {
          setAvailablePatients(
            data.map((p) => ({
              id: p.id,
              name: p.full_name || `Patient (${p.id.slice(0, 8)})`,
            }))
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, user]);

  const resetForm = () => {
    setPatientId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    const doctorId = user?.id;
    if (!sb || !doctorId) {
      toast.error("Not signed in");
      return;
    }
    const pid = patientId.trim();
    if (!UUID_RE.test(pid)) {
      toast.error("Enter a valid patient profile UUID (e.g. 8-4-4-4-12 hex format)");
      return;
    }
    if (pid === doctorId) {
      toast.error("Patient id cannot be the same as your account");
      return;
    }

    setSubmitting(true);
    const { error } = await sb.from("care_relationships").insert({
      doctor_id: doctorId,
      patient_id: pid,
      health_status: "normal",
      risk_flags: [],
    });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("This patient is already linked to you");
      } else if (error.code === "23503") {
        toast.error("No profile found for that id (check the UUID)");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Patient linked successfully");
    resetForm();
    setOpen(false);
    onLinked();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className={`rounded-2xl shadow-sm hover:opacity-95 ${portalPrimaryButtonClass}`}>
          <UserPlus className="w-4 h-4 mr-2" />
          Link Patient
        </Button>
      </DialogTrigger>
      <DialogContent className={`${portalDialogClass} sm:max-w-md`}>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold font-['Manrope']">Link a Patient</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Select a patient from the list or paste their profile ID from their{" "}
              <span className="font-bold text-slate-800">Account settings</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {availablePatients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-lime-800 font-bold text-xs">
                  Select Registered Patient
                </Label>
                <select
                  className={`${portalSelectTriggerClass} flex h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-800 focus-visible:outline-none`}
                  onChange={(e) => {
                    if (e.target.value) {
                      setPatientId(e.target.value);
                    }
                  }}
                  value={availablePatients.some((p) => p.id === patientId) ? patientId : ""}
                >
                  <option value="" disabled className={portalSelectItemClass}>
                    {loadingPatients ? "Loading patient profiles..." : "— Select an available patient —"}
                  </option>
                  {availablePatients.map((p) => (
                    <option key={p.id} value={p.id} className={portalSelectItemClass}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="link_patient_id" className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Patient Profile ID</Label>
              <Input
                id="link_patient_id"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="off"
                required
                className={portalInputClass}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className={portalPrimaryButtonClass} disabled={submitting}>
              {submitting ? "Linking…" : "Link Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
