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
        <Button type="button" variant="default">
          <UserPlus className="w-4 h-4 mr-2" />
          Link patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>Link a patient</DialogTitle>
            <DialogDescription>
              Ask the patient for their profile ID from{" "}
              <span className="font-medium">Account settings</span> in the patient
              portal, then paste it below. Optional fields populate the patient
              card.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link_patient_id">Patient profile ID</Label>
              <Input
                id="link_patient_id"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_last_visit">Last visit (optional)</Label>
              <Input
                id="link_last_visit"
                type="date"
                value={lastVisit}
                onChange={(e) => setLastVisit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_condition">Primary condition (optional)</Label>
              <Input
                id="link_condition"
                value={primaryCondition}
                onChange={(e) => setPrimaryCondition(e.target.value)}
                placeholder="e.g. Type 2 Diabetes"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="link_hr">Heart rate</Label>
                <Input
                  id="link_hr"
                  inputMode="numeric"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="bpm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_glucose">Glucose</Label>
                <Input
                  id="link_glucose"
                  inputMode="numeric"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  placeholder="mg/dL"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="link_bps">BP systolic</Label>
                <Input
                  id="link_bps"
                  inputMode="numeric"
                  value={bpSys}
                  onChange={(e) => setBpSys(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link_bpd">BP diastolic</Label>
                <Input
                  id="link_bpd"
                  inputMode="numeric"
                  value={bpDia}
                  onChange={(e) => setBpDia(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_status">Health status</Label>
              <select
                id="link_status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={healthStatus}
                onChange={(e) =>
                  setHealthStatus(e.target.value as "normal" | "elevated" | "risk")
                }
              >
                <option value="normal">Normal</option>
                <option value="elevated">Elevated</option>
                <option value="risk">Risk</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link_flags">Risk flags (optional)</Label>
              <Input
                id="link_flags"
                value={riskFlags}
                onChange={(e) => setRiskFlags(e.target.value)}
                placeholder="Comma-separated, e.g. High glucose, Elevated BP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Linking…" : "Link patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
