import { useState } from "react";
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  onLinked: () => void;
};

export default function LinkPatientDialog({ onLinked }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [lastVisit, setLastVisit] = useState("");
  const [primaryCondition, setPrimaryCondition] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [glucose, setGlucose] = useState("");
  const [healthStatus, setHealthStatus] = useState<"normal" | "elevated" | "risk">(
    "normal",
  );
  const [riskFlags, setRiskFlags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setPatientId("");
    setLastVisit("");
    setPrimaryCondition("");
    setHeartRate("");
    setBpSys("");
    setBpDia("");
    setGlucose("");
    setHealthStatus("normal");
    setRiskFlags("");
  };

  const parseIntOrNull = (v: string): number | null => {
    const n = parseInt(v.trim(), 10);
    return Number.isFinite(n) ? n : null;
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
      toast.error("Enter a valid patient profile UUID");
      return;
    }
    if (pid === doctorId) {
      toast.error("Patient id cannot be the same as your account");
      return;
    }

    const flags = riskFlags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    const { error } = await sb.from("care_relationships").insert({
      doctor_id: doctorId,
      patient_id: pid,
      last_visit: lastVisit.trim() || null,
      primary_condition: primaryCondition.trim() || null,
      heart_rate: parseIntOrNull(heartRate),
      blood_pressure_systolic: parseIntOrNull(bpSys),
      blood_pressure_diastolic: parseIntOrNull(bpDia),
      glucose: parseIntOrNull(glucose),
      health_status: healthStatus,
      risk_flags: flags.length ? flags : [],
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

    toast.success("Patient linked");
    resetForm();
    setOpen(false);
    onLinked();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className={`rounded-xl shadow-lg shadow-orange-500/30 hover:opacity-90 ${portalPrimaryButtonClass}`}>
          <UserPlus className="w-4 h-4 mr-2" />
          Link patient
        </Button>
      </DialogTrigger>
      <DialogContent className={`${portalDialogClass} max-h-[90vh] overflow-y-auto sm:max-w-md`}>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle className="text-white">Link a patient</DialogTitle>
            <DialogDescription className="text-[#A1A1AA]">
              Ask the patient for their profile ID from{" "}
              <span className="font-medium text-white">Account settings</span> in the patient
              portal, then paste it below. Optional fields populate the patient
              card.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link_patient_id" className="text-white">Patient profile ID</Label>
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
            <div className="space-y-2">
              <Label htmlFor="link_last_visit" className="text-white">Last visit (optional)</Label>
              <Input
                id="link_last_visit"
                type="date"
                value={lastVisit}
                onChange={(e) => setLastVisit(e.target.value)}
                className={portalInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_condition" className="text-white">Primary condition (optional)</Label>
              <Input
                id="link_condition"
                value={primaryCondition}
                onChange={(e) => setPrimaryCondition(e.target.value)}
                placeholder="e.g. Type 2 Diabetes"
                className={portalInputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="link_hr" className="text-white">Heart rate</Label>
                <Input
                  id="link_hr"
                  inputMode="numeric"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="bpm"
                  className={portalInputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_glucose" className="text-white">Glucose</Label>
                <Input
                  id="link_glucose"
                  inputMode="numeric"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  placeholder="mg/dL"
                  className={portalInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="link_bps" className="text-white">BP systolic</Label>
                <Input
                  id="link_bps"
                  inputMode="numeric"
                  value={bpSys}
                  onChange={(e) => setBpSys(e.target.value)}
                  className={portalInputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_bpd" className="text-white">BP diastolic</Label>
                <Input
                  id="link_bpd"
                  inputMode="numeric"
                  value={bpDia}
                  onChange={(e) => setBpDia(e.target.value)}
                  className={portalInputClass}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_status" className="text-white">Health status</Label>
              <select
                id="link_status"
                className={`${portalSelectTriggerClass} flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl focus-visible:outline-none`}
                value={healthStatus}
                onChange={(e) =>
                  setHealthStatus(e.target.value as "normal" | "elevated" | "risk")
                }
              >
                <option value="normal" className={portalSelectItemClass}>Normal</option>
                <option value="elevated" className={portalSelectItemClass}>Elevated</option>
                <option value="risk" className={portalSelectItemClass}>Risk</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_flags" className="text-white">Risk flags (optional)</Label>
              <Input
                id="link_flags"
                value={riskFlags}
                onChange={(e) => setRiskFlags(e.target.value)}
                placeholder="Comma-separated, e.g. High glucose, Elevated BP"
                className={portalInputClass}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className={portalSecondaryButtonClass} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className={portalPrimaryButtonClass} disabled={submitting}>
              {submitting ? "Linking…" : "Link patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
