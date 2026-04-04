import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { Upload, TrendingUp, TrendingDown, Minus, CheckCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function PatientHome() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const glucoseData = [
    { date: "Jan", value: 95 },
    { date: "Feb", value: 98 },
    { date: "Mar", value: 92 },
    { date: "Apr", value: 94 },
  ];

  const cholesterolData = [
    { name: "Total", value: 180, status: "normal" },
    { name: "LDL", value: 100, status: "normal" },
    { name: "HDL", value: 60, status: "good" },
    { name: "Triglycerides", value: 120, status: "normal" },
  ];

  const vitalSigns = [
    { label: "Blood Pressure", value: "120/80", status: "normal", trend: "stable" },
    { label: "Heart Rate", value: "72 bpm", status: "normal", trend: "stable" },
    { label: "Temperature", value: "98.6°F", status: "normal", trend: "stable" },
    { label: "Oxygen Saturation", value: "98%", status: "normal", trend: "stable" },
  ];

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === "normal" || status === "good") return "bg-green-100 text-green-800";
    if (status === "elevated") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Health Overview</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your health summary.</p>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Lab Test Results</CardTitle>
            <CardDescription>
              Upload your lab reports for AI-powered analysis and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="lab-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
              />
              <label htmlFor="lab-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  {uploadedFile ? uploadedFile.name : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
              </label>
            </div>
            {uploadedFile && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>File uploaded successfully! AI analysis in progress...</span>
              </div>
            )}
            <Button className="w-full mt-4" disabled={!uploadedFile}>
              Analyze with AI
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {vitalSigns.map((vital) => (
          <Card key={vital.label}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{vital.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{vital.value}</p>
                  <Badge className={`mt-2 ${getStatusColor(vital.status)}`}>
                    {vital.status}
                  </Badge>
                </div>
                {getTrendIcon(vital.trend)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Glucose Levels Trend</CardTitle>
            <CardDescription>Last 4 months average (mg/dL)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={glucoseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[80, 120]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  name="Glucose"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cholesterol Profile</CardTitle>
            <CardDescription>Latest lab results (mg/dL)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cholesterolData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
          <CardDescription>Overall health assessment based on your recent data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Health Score</span>
                <span className="text-sm font-bold text-green-600">85/100</span>
              </div>
              <Progress value={85} className="h-3" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-xs text-gray-500">Cardiovascular</p>
                <p className="text-lg font-bold text-green-600">Good</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Metabolic</p>
                <p className="text-lg font-bold text-green-600">Normal</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Kidney Function</p>
                <p className="text-lg font-bold text-green-600">Excellent</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Liver Function</p>
                <p className="text-lg font-bold text-green-600">Normal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
