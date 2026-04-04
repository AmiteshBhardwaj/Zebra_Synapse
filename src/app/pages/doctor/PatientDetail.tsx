import { useParams, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  ArrowLeft,
  Heart,
  Activity,
  TrendingUp,
  FileText,
  Pill,
  AlertTriangle,
  Calendar,
  Upload,
  Send,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import {
  CARE_RELATIONSHIPS_LIST_SELECT,
  formatBloodPressure,
  formatDisplayDate,
  type CareRelationshipListRow,
} from "../../../lib/careRelationships";
import { getSupabase } from "../../../lib/supabase";
import {
  PRESCRIPTIONS_SELECT,
  formatPrescriptionDate,
  prescriptionHeading,
  type PrescriptionRow,
} from "../../../lib/prescriptions";
import { toast } from "sonner";

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [rel, setRel] = useState<CareRelationshipListRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [prescLoading, setPrescLoading] = useState(false);
  const [prescSaving, setPrescSaving] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) {
      setLoadError("Missing patient id.");
      setLoading(false);
      return;
    }
    const sb = getSupabase();
    if (!sb || !user) {
      setLoadError("Not signed in.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const { data, error: qErr } = await sb
      .from("care_relationships")
      .select(CARE_RELATIONSHIPS_LIST_SELECT)
      .eq("doctor_id", user.id)
      .eq("patient_id", patientId)
      .maybeSingle();

    if (qErr) {
      setLoadError(qErr.message);
      setRel(null);
      setLoading(false);
      return;
    }

    setRel((data as CareRelationshipListRow | null) ?? null);
    setLoading(false);
  }, [patientId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPrescriptions([]);
  }, [patientId]);

  const loadPrescriptions = useCallback(async () => {
    if (!patientId) return;
    const sb = getSupabase();
    if (!sb) return;
    setPrescLoading(true);
    const { data, error } = await sb
      .from("prescriptions")
      .select(PRESCRIPTIONS_SELECT)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    setPrescLoading(false);
    if (error) {
      console.error("[prescriptions]", error.message);
      toast.error("Could not load prescriptions");
      setPrescriptions([]);
      return;
    }
    setPrescriptions((data ?? []) as PrescriptionRow[]);
  }, [patientId]);

  useEffect(() => {
    if (rel) void loadPrescriptions();
  }, [rel, loadPrescriptions]);

  const patientName = rel?.patient?.full_name?.trim() || "Patient";
  const patient = {
    name: patientName,
    gender: "—",
    bloodType: "—",
    condition: rel?.primary_condition?.trim() || "—",
    phone: "—",
    email: "—",
    lastVisit: formatDisplayDate(rel?.last_visit ?? rel?.created_at),
    nextAppointment: "—",
    status: (rel?.health_status ?? "normal") as "normal" | "elevated" | "risk",
  };

  const vitalsSummary = {
    heartRate: rel?.heart_rate,
    bloodPressure: formatBloodPressure(
      rel?.blood_pressure_systolic ?? null,
      rel?.blood_pressure_diastolic ?? null,
    ),
    glucose: rel?.glucose,
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const vitalHistory = [
    { date: "Apr 1", heartRate: 76, bloodPressure: 130, glucose: 148 },
    { date: "Apr 2", heartRate: 79, bloodPressure: 128, glucose: 142 },
    { date: "Apr 3", heartRate: 77, bloodPressure: 132, glucose: 150 },
    { date: "Apr 4", heartRate: 78, bloodPressure: 128, glucose: 145 },
  ];

  const labResults = [
    { test: "HbA1c", value: "6.8%", normal: "<5.7%", status: "elevated" },
    { test: "Fasting Glucose", value: "145 mg/dL", normal: "70-100 mg/dL", status: "elevated" },
    { test: "Total Cholesterol", value: "195 mg/dL", normal: "<200 mg/dL", status: "normal" },
    { test: "LDL Cholesterol", value: "110 mg/dL", normal: "<100 mg/dL", status: "elevated" },
    { test: "HDL Cholesterol", value: "48 mg/dL", normal: ">40 mg/dL", status: "normal" },
    { test: "Triglycerides", value: "185 mg/dL", normal: "<150 mg/dL", status: "elevated" },
  ];

  const aiInsights = [
    {
      type: "risk",
      title: "Diabetes Risk Increasing",
      description: "HbA1c trending upward over the past 3 months. Consider adjusting medication or intensifying lifestyle interventions.",
      priority: "high",
    },
    {
      type: "recommendation",
      title: "Nutrition Consultation Recommended",
      description: "Patient's glucose levels show high variability. A nutrition specialist consultation may help with meal planning.",
      priority: "medium",
    },
    {
      type: "positive",
      title: "Medication Adherence Good",
      description: "Wearable and prescription data indicates patient is taking medications as prescribed.",
      priority: "low",
    },
  ];

  const handlePrescriptionUpload = async () => {
    const text = prescription.trim();
    if (!text) {
      toast.error("Enter prescription details first");
      return;
    }
    const sb = getSupabase();
    if (!sb || !user?.id || !patientId) return;
    setPrescSaving(true);
    const { error } = await sb.from("prescriptions").insert({
      patient_id: patientId,
      prescribed_by: user.id,
      details: text,
      status: "active",
    });
    setPrescSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Prescription added to patient record");
    setPrescription("");
    void loadPrescriptions();
  };

  const handleMarkPrescriptionComplete = async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from("prescriptions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Prescription marked completed");
    void loadPrescriptions();
  };

  const handleNotesSubmit = () => {
    const text = notes.trim();
    if (!text) {
      toast.error("Enter notes before saving");
      return;
    }
    toast.success("Clinical notes saved to this session");
    setNotes("");
  };

  const handleQuickAction = (label: string) => {
    toast.success(`${label} — request logged for ${patient.name}`);
  };

  const activePrescriptionsList = prescriptions.filter((r) => r.status === "active");
  const completedPrescriptionsList = prescriptions.filter(
    (r) => r.status === "completed",
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
        Loading patient…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  if (!rel) {
    return (
      <div className="p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/doctor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
        <p className="text-sm text-muted-foreground">
          Patient not found or you do not have access to this record.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Button variant="ghost" className="mb-6" onClick={() => navigate("/doctor")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Button>

      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-muted flex items-center justify-center text-foreground">
              <span className="text-xl">{initials(patient.name)}</span>
            </div>
            <div>
              <h1 className="text-3xl text-foreground">{patient.name}</h1>
              <p className="text-muted-foreground mt-1">
                {patient.gender} • {patient.bloodType}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {patient.phone} • {patient.email}
              </p>
            </div>
          </div>
          <Badge className={
            patient.status === "normal" ? "bg-green-100 text-green-800" :
            patient.status === "elevated" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }>
            {patient.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-500">Heart Rate</p>
            </div>
            <p className="text-2xl font-bold">
              {vitalsSummary.heartRate != null ? `${vitalsSummary.heartRate} bpm` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-gray-500">Blood Pressure</p>
            </div>
            <p className="text-2xl font-bold">{vitalsSummary.bloodPressure ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <p className="text-sm text-gray-500">Glucose</p>
            </div>
            <p className="text-2xl font-bold">
              {vitalsSummary.glucose != null ? `${vitalsSummary.glucose} mg/dL` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <p className="text-sm text-gray-500">Next Appointment</p>
            </div>
            <p className="text-lg font-bold">{patient.nextAppointment}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Vitals History</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Primary Condition</p>
                  <p className="font-semibold">{patient.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Visit</p>
                  <p className="font-semibold">{patient.lastVisit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Next Appointment</p>
                  <p className="font-semibold">{patient.nextAppointment}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="font-semibold">{patient.phone}</p>
                  <p className="text-sm text-gray-600">{patient.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Medications</CardTitle>
                <CardDescription>Active prescriptions on file</CardDescription>
              </CardHeader>
              <CardContent>
                {prescLoading ? (
                  <p className="text-sm text-muted-foreground">Loading prescriptions…</p>
                ) : activePrescriptionsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active prescriptions. Add one under Actions.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activePrescriptionsList.map((rx) => (
                      <div key={rx.id} className="border rounded p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="w-4 h-4 text-indigo-600" />
                          <p className="font-semibold">{prescriptionHeading(rx.details)}</p>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{rx.details}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Prescribed by{" "}
                          {rx.prescribed_by === user?.id
                            ? "you"
                            : rx.prescriber?.full_name?.trim() || "Doctor"}{" "}
                          on {formatPrescriptionDate(rx.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle>Vital Signs Trends - Last 7 Days</CardTitle>
              <CardDescription>Real-time data from patient's wearable devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Heart Rate</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={vitalHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} name="Heart Rate (bpm)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Blood Pressure (Systolic)</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={vitalHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[100, 150]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bloodPressure" stroke="#3b82f6" strokeWidth={2} name="Systolic (mmHg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Glucose Levels</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={vitalHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[100, 180]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="glucose" stroke="#8b5cf6" strokeWidth={2} name="Glucose (mg/dL)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs">
          <Card>
            <CardHeader>
              <CardTitle>Latest Lab Results</CardTitle>
              <CardDescription>Uploaded on {patient.lastVisit}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {labResults.map((lab, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold">{lab.test}</p>
                      <p className="text-sm text-gray-500">Normal range: {lab.normal}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold">{lab.value}</p>
                      <Badge className={
                        lab.status === "normal" ? "bg-green-100 text-green-800" :
                        lab.status === "elevated" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }>
                        {lab.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications">
          <Card>
            <CardHeader>
              <CardTitle>Medication History</CardTitle>
              <CardDescription>Current and past prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {prescLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Active</h4>
                    {activePrescriptionsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {activePrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-green-500 pl-4 py-2"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {rx.prescribed_by === user?.id
                                    ? "You"
                                    : rx.prescriber?.full_name?.trim() || "Doctor"}{" "}
                                  · {formatPrescriptionDate(rx.created_at)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                                {rx.prescribed_by === user?.id ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleMarkPrescriptionComplete(rx.id)}
                                  >
                                    Mark completed
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Completed</h4>
                    {completedPrescriptionsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {completedPrescriptionsList.map((rx) => (
                          <div
                            key={rx.id}
                            className="border-l-4 border-gray-300 pl-4 py-2 opacity-90"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold">{prescriptionHeading(rx.details)}</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                                  {rx.details}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {rx.prescriber?.full_name?.trim() || "Doctor"} · prescribed{" "}
                                  {formatPrescriptionDate(rx.created_at)}
                                  {rx.completed_at
                                    ? ` · completed ${formatPrescriptionDate(rx.completed_at)}`
                                    : null}
                                </p>
                              </div>
                              <Badge className="bg-gray-100 text-gray-800 shrink-0">Completed</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights">
          <div className="space-y-4">
            {aiInsights.map((insight, index) => {
              const getInsightConfig = (type: string) => {
                if (type === "risk") return { bg: "bg-red-50", border: "border-red-200", icon: <AlertTriangle className="w-5 h-5 text-red-600" /> };
                if (type === "recommendation") return { bg: "bg-yellow-50", border: "border-yellow-200", icon: <FileText className="w-5 h-5 text-yellow-600" /> };
                return { bg: "bg-green-50", border: "border-green-200", icon: <Activity className="w-5 h-5 text-green-600" /> };
              };
              const config = getInsightConfig(insight.type);

              return (
                <Card key={index} className={`border-2 ${config.border} ${config.bg}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div>{config.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-lg">{insight.title}</h4>
                          <Badge className={
                            insight.priority === "high" ? "bg-red-100 text-red-800" :
                            insight.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          }>
                            {insight.priority} priority
                          </Badge>
                        </div>
                        <p className="text-gray-700">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Prescription</CardTitle>
                <CardDescription>Add new prescription for this patient</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prescription">Prescription Details</Label>
                    <Textarea
                      id="prescription"
                      placeholder="Enter medication name, dosage, frequency, and instructions..."
                      value={prescription}
                      onChange={(e) => setPrescription(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={prescSaving}
                    onClick={() => void handlePrescriptionUpload()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {prescSaving ? "Saving…" : "Upload to Patient's Account"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
                <CardDescription>Add notes for this patient's record</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter clinical observations, treatment plans, or follow-up instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    variant="outline"
                    onClick={handleNotesSubmit}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Save Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickAction("Schedule follow-up")}
                >
                  Schedule Follow-up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickAction("Lab test request")}
                >
                  Request Lab Tests
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickAction("Message to patient")}
                >
                  Send Message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickAction("Specialist referral")}
                >
                  Refer to Specialist
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickAction("Treatment plan update")}
                >
                  Update Treatment Plan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickAction("Clinical report")}
                >
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
