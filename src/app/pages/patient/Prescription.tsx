import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Pill, Clock, AlertCircle, Calendar } from "lucide-react";

export default function Prescription() {
  const activePrescriptions = [
    {
      id: 1,
      medication: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      duration: "Ongoing",
      prescribedBy: "Dr. Michael Chen",
      prescribedDate: "2026-03-15",
      instructions: "Take with meals to reduce stomach upset",
      refillsLeft: 3,
    },
    {
      id: 2,
      medication: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      duration: "Ongoing",
      prescribedBy: "Dr. Sarah Johnson",
      prescribedDate: "2026-02-20",
      instructions: "Take in the morning, preferably at the same time each day",
      refillsLeft: 2,
    },
    {
      id: 3,
      medication: "Atorvastatin",
      dosage: "20mg",
      frequency: "Once daily",
      duration: "Ongoing",
      prescribedBy: "Dr. Sarah Johnson",
      prescribedDate: "2026-01-10",
      instructions: "Take in the evening with or without food",
      refillsLeft: 5,
    },
  ];

  const completedPrescriptions = [
    {
      id: 4,
      medication: "Amoxicillin",
      dosage: "500mg",
      frequency: "Three times daily",
      duration: "7 days",
      prescribedBy: "Dr. Emily Williams",
      prescribedDate: "2026-03-01",
      completedDate: "2026-03-08",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
        <p className="text-gray-600 mt-1">Manage your medications and prescriptions</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Prescriptions</h2>
        <div className="space-y-4">
          {activePrescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Pill className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{prescription.medication}</h3>
                      <p className="text-gray-600">{prescription.dosage} • {prescription.frequency}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Prescribed: {prescription.prescribedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Duration: {prescription.duration}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm">Instructions</p>
                      <p className="text-sm text-blue-800">{prescription.instructions}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Prescribed by</p>
                    <p className="font-medium">{prescription.prescribedBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Refills remaining</p>
                    <p className="font-medium text-lg">{prescription.refillsLeft}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button variant="outline">Request Refill</Button>
                  <Button variant="outline">Contact Doctor</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Completed Prescriptions</h2>
        <div className="space-y-4">
          {completedPrescriptions.map((prescription) => (
            <Card key={prescription.id} className="opacity-75">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Pill className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{prescription.medication}</h3>
                      <p className="text-gray-600">{prescription.dosage} • {prescription.frequency}</p>
                    </div>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Prescribed: {prescription.prescribedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Completed: {prescription.completedDate}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-500">Prescribed by</p>
                  <p className="font-medium">{prescription.prescribedBy}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
