import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { getSupabase } from "../../../lib/supabase";
import {
  PRESCRIPTIONS_SELECT,
  formatPrescriptionDate,
  prescriptionHeading,
  type PrescriptionRow,
} from "../../../lib/prescriptions";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Pill, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  PatientPortalPage,
  portalInsetClass,
  portalPanelClass,
  portalSecondaryButtonClass,
} from "../../components/patient/PortalTheme";

export default function Prescription() {
  const { user } = useAuth();
  const [list, setList] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const uid = user?.id;
    if (!sb || !uid) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await sb
      .from("prescriptions")
      .select(PRESCRIPTIONS_SELECT)
      .eq("patient_id", uid)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      setList([]);
      return;
    }
    setList(((data ?? []) as unknown) as PrescriptionRow[]);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = list.filter((r) => r.status === "active");
  const completed = list.filter((r) => r.status === "completed");

  const prescriberLabel = (rx: PrescriptionRow) =>
    rx.prescriber?.full_name?.trim() || "Your doctor";

  const handleRequestRefill = (rx: PrescriptionRow) => {
    toast.success(`Refill request submitted for ${prescriptionHeading(rx.details)}`);
  };

  const handleContactDoctor = (rx: PrescriptionRow) => {
    toast(`Contact details available for ${prescriberLabel(rx)}`);
  };

  return (
    <PatientPortalPage>
      {/* Sleek Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a3d]/25 to-[#f05a28]/15 border border-[#ff8a3d]/35 shadow-[0_12px_28px_rgba(255,122,51,0.2)]">
            <Pill className="h-6 w-6 text-[#ff9c61]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Prescriptions</h1>
              <span className="rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/12 px-2.5 py-0.5 text-[10px] font-semibold text-[#ff9c61] uppercase tracking-wider">
                Medication Vault
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#b4c9e8] mt-1 font-medium leading-relaxed">
              Medications prescribed by your care team, dosage schedules, and active refill requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {active.length} Active Rx
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#A1A1AA]">Loading prescriptions…</p>
      ) : null}

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Active Prescriptions</h2>
          {!loading && active.length === 0 ? (
            <div className={`${portalPanelClass} p-6 text-center text-sm text-[#92a8c7]`}>
              No active prescriptions yet. Your doctor will add them from their dashboard.
            </div>
          ) : null}
          <div className="space-y-4">
            {active.map((rx) => (
              <Card key={rx.id} className={portalPanelClass}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 bg-[#ff9c61]/15 border border-[#ff9c61]/30 rounded-2xl flex items-center justify-center shrink-0">
                        <Pill className="w-6 h-6 text-[#ff9c61]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-white">{prescriptionHeading(rx.details)}</h3>
                        <p className="text-xs text-[#92a8c7] mt-1">Prescribed by {prescriberLabel(rx)}</p>
                      </div>
                    </div>
                    <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-200 shrink-0">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#92a8c7] mb-4">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Prescribed: {formatPrescriptionDate(rx.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#ff7a33] to-[#ff9b61] text-white rounded-xl"
                      onClick={() => handleRequestRefill(rx)}
                    >
                      Request Refill
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={portalSecondaryButtonClass}
                      onClick={() => handleContactDoctor(rx)}
                    >
                      Contact Doctor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {completed.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Past Prescriptions</h2>
            <div className="space-y-4">
              {completed.map((rx) => (
                <Card key={rx.id} className={portalPanelClass}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                          <Pill className="w-6 h-6 text-[#92a8c7]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-white">{prescriptionHeading(rx.details)}</h3>
                          <p className="text-xs text-[#92a8c7] mt-1">Prescribed by {prescriberLabel(rx)}</p>
                        </div>
                      </div>
                      <Badge className="border-white/10 bg-white/5 text-white/60 shrink-0">
                        Completed
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PatientPortalPage>
  );
}
