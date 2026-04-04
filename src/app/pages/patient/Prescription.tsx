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
import { Pill, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";

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
    setList((data ?? []) as PrescriptionRow[]);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = list.filter((r) => r.status === "active");
  const completed = list.filter((r) => r.status === "completed");

  const prescriberLabel = (rx: PrescriptionRow) =>
    rx.prescriber?.full_name?.trim() || "Your doctor";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
        <p className="text-gray-600 mt-1">Medications prescribed by your care team</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading prescriptions…</p>
      ) : null}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Prescriptions</h2>
        {!loading && active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active prescriptions yet. Your doctor will add them from their dashboard.
          </p>
        ) : null}
        <div className="space-y-4">
          {active.map((rx) => (
            <Card key={rx.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold">{prescriptionHeading(rx.details)}</h3>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 shrink-0">Active</Badge>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Prescribed: {formatPrescriptionDate(rx.created_at)}</span>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-blue-900 text-sm">Details</p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">{rx.details}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Prescribed by</p>
                  <p className="font-medium">{prescriberLabel(rx)}</p>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button type="button" variant="outline" disabled>
                    Request Refill
                  </Button>
                  <Button type="button" variant="outline" disabled>
                    Contact Doctor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Completed Prescriptions</h2>
        {!loading && completed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed prescriptions yet.</p>
        ) : null}
        <div className="space-y-4">
          {completed.map((rx) => (
            <Card key={rx.id} className="opacity-75">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold">{prescriptionHeading(rx.details)}</h3>
                    </div>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800 shrink-0">Completed</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Prescribed: {formatPrescriptionDate(rx.created_at)}</span>
                  </div>
                  {rx.completed_at ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Completed: {formatPrescriptionDate(rx.completed_at)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-500">Prescribed by</p>
                  <p className="font-medium">{prescriberLabel(rx)}</p>
                </div>
                <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{rx.details}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
