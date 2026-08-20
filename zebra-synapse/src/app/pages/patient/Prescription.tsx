import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { getSupabase } from "../../../lib/supabase";
import {
  PRESCRIPTIONS_SELECT,
  fetchPatientPrescriptions,
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
    setLoading(true);
    try {
      const data = await fetchPatientPrescriptions(sb, uid);
      setList(data || []);
    } catch (err) {
      console.error("[Prescription page] Error loading prescriptions:", err);
      setList([]);
    } finally {
      setLoading(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-[#0099ff] shadow-sm">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-['Manrope']">Prescriptions</h1>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-[#0284c7] uppercase tracking-wider">
                Medication Vault
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">
              Medications prescribed by your care team, dosage schedules, and active refill requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-1.5 text-slate-700 font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {active.length} Active Rx
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Loading prescriptions…</p>
      ) : null}

      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-3 font-['Manrope']">Active Prescriptions</h2>
          {!loading && active.length === 0 ? (
            <div className={`${portalPanelClass} p-6 text-center text-xs text-slate-400`}>
              No active prescriptions yet. Your doctor will add them from their dashboard.
            </div>
          ) : null}
          <div className="space-y-4">
            {active.map((rx) => (
              <Card key={rx.id} className={portalPanelClass}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 bg-sky-500/15 text-[#0099ff] rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Pill className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Manrope']">{prescriptionHeading(rx.details)}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Prescribed by {prescriberLabel(rx)}</p>
                      </div>
                    </div>
                    <Badge className="border-sky-200 bg-sky-50 text-[#0284c7] font-bold text-xs shrink-0">
                      Active
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                    <Calendar className="w-4 h-4 shrink-0 text-[#0099ff]" />
                    <span>Prescribed: {formatPrescriptionDate(rx.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-[#0099ff] to-[#3b82f6] hover:from-[#0088e6] hover:to-[#2563eb] text-white font-bold text-xs rounded-2xl px-4 h-9 shadow-sm"
                      onClick={() => handleRequestRefill(rx)}
                    >
                      Request Refill
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`rounded-2xl text-xs h-9 px-4 ${portalSecondaryButtonClass}`}
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
            <h2 className="text-base font-bold text-slate-900 mb-3 font-['Manrope']">Past Prescriptions</h2>
            <div className="space-y-4">
              {completed.map((rx) => (
                <Card key={rx.id} className={portalPanelClass}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center shrink-0 text-slate-400">
                          <Pill className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 font-['Manrope']">{prescriptionHeading(rx.details)}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Prescribed by {prescriberLabel(rx)}</p>
                        </div>
                      </div>
                      <Badge className="border-slate-200 bg-slate-100 text-slate-600 font-bold text-xs shrink-0">
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
