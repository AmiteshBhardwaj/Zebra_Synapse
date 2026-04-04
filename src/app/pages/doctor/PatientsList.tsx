import { useNavigate } from "react-router";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Heart, TrendingUp, Activity, AlertTriangle, Search } from "lucide-react";

export default function PatientsList() {
  const navigate = useNavigate();

  const patients = [
    {
      id: "1",
      name: "John Miller",
      age: 45,
      lastVisit: "2026-03-28",
      condition: "Type 2 Diabetes",
      vitals: {
        heartRate: 78,
        bloodPressure: "128/85",
        glucose: 145,
        status: "elevated",
      },
      riskFlags: ["High glucose", "Elevated BP"],
    },
    {
      id: "2",
      name: "Emma Thompson",
      age: 52,
      lastVisit: "2026-04-01",
      condition: "Hypertension",
      vitals: {
        heartRate: 72,
        bloodPressure: "120/80",
        glucose: 92,
        status: "normal",
      },
      riskFlags: [],
    },
    {
      id: "3",
      name: "Michael Chen",
      age: 38,
      lastVisit: "2026-03-25",
      condition: "Prediabetes",
      vitals: {
        heartRate: 68,
        bloodPressure: "118/78",
        glucose: 108,
        status: "normal",
      },
      riskFlags: [],
    },
    {
      id: "4",
      name: "Sarah Williams",
      age: 61,
      lastVisit: "2026-04-02",
      condition: "Cardiovascular Disease",
      vitals: {
        heartRate: 88,
        bloodPressure: "142/92",
        glucose: 98,
        status: "risk",
      },
      riskFlags: ["Elevated BP", "High heart rate", "Irregular rhythm detected"],
    },
    {
      id: "5",
      name: "David Rodriguez",
      age: 48,
      lastVisit: "2026-03-30",
      condition: "Hyperlipidemia",
      vitals: {
        heartRate: 70,
        bloodPressure: "122/82",
        glucose: 95,
        status: "elevated",
      },
      riskFlags: ["LDL trending up"],
    },
    {
      id: "6",
      name: "Lisa Anderson",
      age: 34,
      lastVisit: "2026-04-03",
      condition: "General Checkup",
      vitals: {
        heartRate: 65,
        bloodPressure: "115/75",
        glucose: 88,
        status: "normal",
      },
      riskFlags: [],
    },
  ];

  const getStatusConfig = (status: string) => {
    if (status === "normal") {
      return {
        badge: "bg-green-100 text-green-800",
        icon: <Activity className="w-5 h-5 text-green-600" />,
        label: "Normal",
        cardBorder: "border-green-200",
      };
    }
    if (status === "elevated") {
      return {
        badge: "bg-yellow-100 text-yellow-800",
        icon: <TrendingUp className="w-5 h-5 text-yellow-600" />,
        label: "Elevated",
        cardBorder: "border-yellow-200",
      };
    }
    return {
      badge: "bg-red-100 text-red-800",
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      label: "Risk",
      cardBorder: "border-red-200",
    };
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground">My Patients</h1>
        <p className="text-muted-foreground mt-1">Monitor your patients' health status in real-time</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search patients by name, condition, or status..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {patients.map((patient) => {
          const statusConfig = getStatusConfig(patient.vitals.status);
          return (
            <Card
              key={patient.id}
              className="hover:border-foreground/20 transition-colors cursor-pointer"
              onClick={() => navigate(`/doctor/patient/${patient.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-muted flex items-center justify-center text-foreground">
                      <span className="text-base">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg">{patient.name}</h3>
                        <Badge className={statusConfig.badge}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {patient.age} years • {patient.condition} • Last visit: {patient.lastVisit}
                      </p>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                          <div>
                            <p className="text-xs text-muted-foreground">Heart Rate</p>
                            <p className="text-sm">{patient.vitals.heartRate} bpm</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                          <div>
                            <p className="text-xs text-muted-foreground">Blood Pressure</p>
                            <p className="text-sm">{patient.vitals.bloodPressure}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                          <div>
                            <p className="text-xs text-muted-foreground">Glucose</p>
                            <p className="text-sm">{patient.vitals.glucose} mg/dL</p>
                          </div>
                        </div>
                      </div>

                      {patient.riskFlags.length > 0 && (
                        <div className="flex items-start gap-2 bg-muted border border-border p-3">
                          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                          <div>
                            <p className="text-xs font-medium mb-1">Risk Flags</p>
                            <div className="flex flex-wrap gap-1">
                              {patient.riskFlags.map((flag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {flag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center ml-4">
                    {statusConfig.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center">
                <Activity className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Normal Status</p>
                <p className="text-2xl">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Elevated</p>
                <p className="text-2xl">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
