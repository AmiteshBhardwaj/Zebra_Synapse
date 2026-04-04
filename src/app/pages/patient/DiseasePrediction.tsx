import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { AlertTriangle, TrendingUp, CheckCircle, Info } from "lucide-react";

export default function DiseasePrediction() {
  const riskAssessments = [
    {
      disease: "Type 2 Diabetes",
      riskLevel: "moderate",
      riskScore: 35,
      factors: [
        "Family history of diabetes",
        "Borderline fasting glucose (94 mg/dL)",
        "BMI in overweight range",
      ],
      recommendations: [
        "Monitor blood glucose levels regularly",
        "Increase physical activity to 150 minutes per week",
        "Consider consultation with an endocrinologist",
      ],
    },
    {
      disease: "Cardiovascular Disease",
      riskLevel: "low",
      riskScore: 15,
      factors: [
        "Cholesterol levels within normal range",
        "Blood pressure well controlled",
      ],
      recommendations: [
        "Continue current lifestyle and medications",
        "Annual cardiovascular checkup recommended",
      ],
    },
    {
      disease: "Hypertension",
      riskLevel: "low",
      riskScore: 12,
      factors: [
        "Current blood pressure: 120/80 mmHg",
        "Taking prescribed medication regularly",
      ],
      recommendations: [
        "Maintain current medication regimen",
        "Continue low-sodium diet",
      ],
    },
  ];

  const getRiskColor = (level: string) => {
    if (level === "high") return { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" };
    if (level === "moderate") return { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" };
    return { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" };
  };

  const getRiskIcon = (level: string) => {
    if (level === "high" || level === "moderate") {
      return <AlertTriangle className="w-5 h-5" />;
    }
    return <CheckCircle className="w-5 h-5" />;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Disease Prediction</h1>
        <p className="text-gray-600 mt-1">AI-powered health risk assessment based on your data</p>
      </div>

      <Alert className="mb-8 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">AI-Powered Analysis</AlertTitle>
        <AlertDescription className="text-blue-800">
          Our machine learning models analyze your lab results, vitals, and medical history to predict potential health risks.
          This is not a diagnosis - always consult with your healthcare provider for medical advice.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {riskAssessments.map((assessment, index) => {
          const colors = getRiskColor(assessment.riskLevel);
          return (
            <Card key={index} className={`border-2 ${colors.border}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                      {getRiskIcon(assessment.riskLevel)}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{assessment.disease}</CardTitle>
                      <CardDescription>Risk assessment based on current health data</CardDescription>
                    </div>
                  </div>
                  <Badge className={`${colors.bg} ${colors.text} capitalize`}>
                    {assessment.riskLevel} Risk
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Risk Score</span>
                    <span className="text-sm font-bold">{assessment.riskScore}%</span>
                  </div>
                  <Progress
                    value={assessment.riskScore}
                    className="h-3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Risk Factors Identified
                    </h4>
                    <ul className="space-y-2">
                      {assessment.factors.map((factor, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-orange-500 mt-1">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      AI Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {assessment.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-green-500 mt-1">✓</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline">Learn More</Button>
                  <Button variant="outline">Schedule Consultation</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle>Overall Health Assessment</CardTitle>
          <CardDescription>Based on all analyzed risk factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Your overall health score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-indigo-600">78</span>
                <span className="text-gray-500">/100</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">Good - Continue maintaining healthy habits</p>
            </div>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-3xl font-bold">B+</p>
                <p className="text-xs">Grade</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
