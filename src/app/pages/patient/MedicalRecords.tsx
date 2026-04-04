import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, TrendingUp, TrendingDown } from "lucide-react";

export default function MedicalRecords() {
  const labTests = [
    {
      date: "2026-04-01",
      type: "Complete Blood Count",
      status: "normal",
      doctor: "Dr. Sarah Johnson",
    },
    {
      date: "2026-03-15",
      type: "Lipid Panel",
      status: "normal",
      doctor: "Dr. Michael Chen",
    },
    {
      date: "2026-02-28",
      type: "Comprehensive Metabolic Panel",
      status: "normal",
      doctor: "Dr. Sarah Johnson",
    },
    {
      date: "2026-01-10",
      type: "Thyroid Function Test",
      status: "normal",
      doctor: "Dr. Emily Williams",
    },
  ];

  const hemoglobinData = [
    { date: "Jan", value: 14.2 },
    { date: "Feb", value: 14.5 },
    { date: "Mar", value: 14.3 },
    { date: "Apr", value: 14.6 },
  ];

  const cholesterolTrend = [
    { date: "Jan", total: 185, ldl: 105, hdl: 58 },
    { date: "Feb", total: 182, ldl: 102, hdl: 60 },
    { date: "Mar", total: 180, ldl: 100, hdl: 60 },
    { date: "Apr", total: 180, ldl: 100, hdl: 60 },
  ];

  const glucoseTrend = [
    { date: "Jan", fasting: 95, postMeal: 120 },
    { date: "Feb", fasting: 98, postMeal: 125 },
    { date: "Mar", fasting: 92, postMeal: 118 },
    { date: "Apr", fasting: 94, postMeal: 122 },
  ];

  const biomarkers = [
    { name: "Hemoglobin", current: 14.6, normal: "13.5-17.5", unit: "g/dL", trend: "up" },
    { name: "White Blood Cells", current: 7.2, normal: "4.5-11.0", unit: "K/μL", trend: "stable" },
    { name: "Platelets", current: 250, normal: "150-400", unit: "K/μL", trend: "stable" },
    { name: "Total Cholesterol", current: 180, normal: "<200", unit: "mg/dL", trend: "down" },
    { name: "LDL Cholesterol", current: 100, normal: "<100", unit: "mg/dL", trend: "down" },
    { name: "HDL Cholesterol", current: 60, normal: ">40", unit: "mg/dL", trend: "up" },
    { name: "Triglycerides", current: 120, normal: "<150", unit: "mg/dL", trend: "stable" },
    { name: "Fasting Glucose", current: 94, normal: "70-100", unit: "mg/dL", trend: "stable" },
  ];

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-green-500" />;
    return null;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
        <p className="text-gray-600 mt-1">View your lab tests and biomarker trends</p>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Lab Tests</CardTitle>
            <CardDescription>All your uploaded lab reports and results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {labTests.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium">{test.type}</p>
                      <p className="text-sm text-gray-500">
                        {test.date} • {test.doctor}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {test.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Key Biomarkers</CardTitle>
          <CardDescription>Track changes in important health indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {biomarkers.map((marker, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{marker.name}</p>
                    <p className="text-sm text-gray-500">Normal: {marker.normal}</p>
                  </div>
                  {getTrendIcon(marker.trend)}
                </div>
                <p className="text-2xl font-bold text-indigo-600">
                  {marker.current} <span className="text-sm text-gray-500">{marker.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="hemoglobin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hemoglobin">Hemoglobin</TabsTrigger>
          <TabsTrigger value="cholesterol">Cholesterol</TabsTrigger>
          <TabsTrigger value="glucose">Glucose</TabsTrigger>
        </TabsList>

        <TabsContent value="hemoglobin">
          <Card>
            <CardHeader>
              <CardTitle>Hemoglobin Trend</CardTitle>
              <CardDescription>4-month trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hemoglobinData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[13, 16]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={2}
                    name="Hemoglobin (g/dL)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cholesterol">
          <Card>
            <CardHeader>
              <CardTitle>Cholesterol Trend</CardTitle>
              <CardDescription>4-month trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cholesterolTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="ldl" stroke="#ef4444" strokeWidth={2} name="LDL" />
                  <Line type="monotone" dataKey="hdl" stroke="#10b981" strokeWidth={2} name="HDL" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glucose">
          <Card>
            <CardHeader>
              <CardTitle>Glucose Trend</CardTitle>
              <CardDescription>4-month trend analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={glucoseTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[80, 140]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="fasting"
                    stroke="#6366f1"
                    strokeWidth={2}
                    name="Fasting"
                  />
                  <Line
                    type="monotone"
                    dataKey="postMeal"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Post-Meal"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
