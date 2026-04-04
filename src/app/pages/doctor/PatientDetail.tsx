import { useParams, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
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
import { useState } from "react";

export default function PatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");

  const patientData = {
    "1": {
      name: "John Miller",
      age: 45,
      gender: "Male",
      bloodType: "A+",
      condition: "Type 2 Diabetes",
      phone: "(555) 123-4567",
      email: "john.miller@email.com",
      lastVisit: "2026-03-28",
      nextAppointment: "2026-04-15",
      status: "elevated",
    },
  };

  const patient = patientData[patientId as keyof typeof patientData] || patientData["1"];

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

  const currentMedications = [
    { name: "Metformin", dosage: "500mg", frequency: "Twice daily", prescribedBy: "You" },
    { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", prescribedBy: "Dr. Williams" },
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

  const handlePrescriptionUpload = () => {
    alert("Prescription uploaded to patient's account successfully!");
    setPrescription("");
  };

  const handleNotesSubmit = () => {
    alert("Clinical notes saved successfully!");
    setNotes("");
  };

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
              <span className="text-xl">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h1 className="text-3xl text-foreground">{patient.name}</h1>
              <p className="text-muted-foreground mt-1">
                {patient.age} years • {patient.gender} • {patient.bloodType}
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
            <p className="text-2xl font-bold">78 bpm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-gray-500">Blood Pressure</p>
            </div>
            <p className="text-2xl font-bold">128/85</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <p className="text-sm text-gray-500">Glucose</p>
            </div>
            <p className="text-2xl font-bold">145 mg/dL</p>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentMedications.map((med, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Pill className="w-4 h-4 text-indigo-600" />
                        <p className="font-semibold">{med.name}</p>
                      </div>
                      <p className="text-sm text-gray-600">{med.dosage} • {med.frequency}</p>
                      <p className="text-xs text-gray-500 mt-1">Prescribed by: {med.prescribedBy}</p>
                    </div>
                  ))}
                </div>
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
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Metformin 500mg</p>
                      <p className="text-sm text-gray-600">Twice daily with meals</p>
                      <p className="text-xs text-gray-500 mt-1">Prescribed by you on 2026-03-15</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Lisinopril 10mg</p>
                      <p className="text-sm text-gray-600">Once daily in the morning</p>
                      <p className="text-xs text-gray-500 mt-1">Prescribed by Dr. Williams on 2026-02-20</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                </div>
                <div className="border-l-4 border-gray-300 pl-4 py-2 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Amoxicillin 500mg</p>
                      <p className="text-sm text-gray-600">Three times daily for 7 days</p>
                      <p className="text-xs text-gray-500 mt-1">Completed on 2026-03-08</p>
                    </div>
                    <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
                  </div>
                </div>
              </div>
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
                  <Button className="w-full" onClick={handlePrescriptionUpload}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload to Patient's Account
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
                  <Button className="w-full" variant="outline" onClick={handleNotesSubmit}>
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
                <Button variant="outline">Schedule Follow-up</Button>
                <Button variant="outline">Request Lab Tests</Button>
                <Button variant="outline">Send Message</Button>
                <Button variant="outline">Refer to Specialist</Button>
                <Button variant="outline">Update Treatment Plan</Button>
                <Button variant="outline">Generate Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
