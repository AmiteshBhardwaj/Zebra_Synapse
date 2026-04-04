import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { FlaskConical, ExternalLink, MapPin, Calendar, Users, Info, CheckCircle } from "lucide-react";

export default function ClinicalTrials() {
  const flaggedDiseases = [
    { name: "Type 2 Diabetes", risk: "moderate" },
  ];

  const relevantTrials = [
    {
      id: "NCT05234567",
      title: "Novel GLP-1 Receptor Agonist for Type 2 Diabetes Prevention",
      phase: "Phase 3",
      status: "Recruiting",
      description: "A randomized, double-blind study evaluating the efficacy of a new GLP-1 receptor agonist in preventing progression to Type 2 Diabetes in patients with prediabetes.",
      location: "Multiple centers in California, New York, Texas",
      duration: "18 months",
      participants: "500 participants needed",
      eligibility: [
        "Age 30-65 years",
        "Diagnosed with prediabetes (HbA1c 5.7-6.4%)",
        "BMI 25-40 kg/m²",
        "No current diabetes medications",
      ],
      url: "https://clinicaltrials.gov/study/NCT05234567",
      matchScore: 85,
    },
    {
      id: "NCT05345678",
      title: "Lifestyle Intervention and Metformin for Diabetes Prevention",
      phase: "Phase 4",
      status: "Recruiting",
      description: "Comparing the effectiveness of intensive lifestyle intervention versus metformin in preventing Type 2 Diabetes in high-risk individuals.",
      location: "Stanford Medical Center, California",
      duration: "24 months",
      participants: "300 participants needed",
      eligibility: [
        "Age 25-70 years",
        "Fasting glucose 100-125 mg/dL",
        "Family history of Type 2 Diabetes",
        "Willing to participate in lifestyle counseling",
      ],
      url: "https://clinicaltrials.gov/study/NCT05345678",
      matchScore: 78,
    },
  ];

  const getPhaseColor = (phase: string) => {
    if (phase.includes("3") || phase.includes("4")) return "bg-green-100 text-green-800";
    if (phase.includes("2")) return "bg-blue-100 text-blue-800";
    return "bg-purple-100 text-purple-800";
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Clinical Trials</h1>
        <p className="text-gray-600 mt-1">Experimental trials relevant to your health profile</p>
      </div>

      {flaggedDiseases.length > 0 ? (
        <>
          <Alert className="mb-8 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">AI-Matched Clinical Trials</AlertTitle>
            <AlertDescription className="text-blue-800">
              Based on your health risk assessment for <strong>Type 2 Diabetes</strong>, we've found {relevantTrials.length} clinical trials that may be relevant to you.
              Participating in clinical trials can provide access to cutting-edge treatments and contribute to medical research.
            </AlertDescription>
          </Alert>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Flagged Conditions</h2>
            <div className="flex gap-2">
              {flaggedDiseases.map((disease, index) => (
                <Badge key={index} className="bg-yellow-100 text-yellow-800 px-4 py-2">
                  {disease.name} - {disease.risk} risk
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Available Clinical Trials ({relevantTrials.length})</h2>
            {relevantTrials.map((trial) => (
              <Card key={trial.id} className="border-2 hover:border-indigo-300 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FlaskConical className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{trial.title}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getPhaseColor(trial.phase)}>{trial.phase}</Badge>
                          <Badge className="bg-green-100 text-green-800">{trial.status}</Badge>
                          <Badge variant="outline">ID: {trial.id}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="bg-indigo-100 rounded-lg px-3 py-2">
                        <p className="text-xs text-indigo-600">Match Score</p>
                        <p className="text-2xl font-bold text-indigo-700">{trial.matchScore}%</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{trial.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm font-medium">{trial.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm font-medium">{trial.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Enrollment</p>
                        <p className="text-sm font-medium">{trial.participants}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-sm">Eligibility Criteria</h4>
                    <ul className="space-y-1">
                      {trial.eligibility.map((criterion, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{criterion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => window.open(trial.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on ClinicalTrials.gov
                    </Button>
                    <Button variant="outline">Express Interest</Button>
                    <Button variant="outline">Contact Research Team</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-8 bg-amber-50 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Important Information About Clinical Trials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <p>• Clinical trials are research studies that test new treatments or interventions.</p>
              <p>• Participation is voluntary and you can withdraw at any time.</p>
              <p>• All trials listed are registered with ClinicalTrials.gov and follow strict ethical guidelines.</p>
              <p>• Consult with your doctor before enrolling in any clinical trial.</p>
              <p>• AI matching is based on publicly available eligibility criteria and your health profile.</p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Disease Flags Detected</h3>
            <p className="text-gray-600 mb-4">
              Great news! Our AI models haven't flagged any health conditions that would benefit from clinical trial participation at this time.
            </p>
            <p className="text-sm text-gray-500">
              Continue monitoring your health, and we'll notify you if relevant clinical trials become available.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
