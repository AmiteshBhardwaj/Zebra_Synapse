import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Stethoscope, User, Activity } from "lucide-react";

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Activity className="w-8 h-8 text-foreground" strokeWidth={1.5} />
            <h1 className="text-4xl text-foreground tracking-tight">Zebra Synapse</h1>
          </div>
          <p className="text-base text-muted-foreground">AI-Powered Healthcare Management Platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:border-foreground/20 transition-colors">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                </div>
              </div>
              <CardTitle>Patient Portal</CardTitle>
              <CardDescription>Access your health records and wellness insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate("/login/patient")}
              >
                Login as Patient
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/signup/patient")}
              >
                Sign Up
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-foreground/20 transition-colors">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-muted flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                </div>
              </div>
              <CardTitle>Doctor Portal</CardTitle>
              <CardDescription>Monitor and manage your patients' health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={() => navigate("/login/doctor")}
              >
                Login as Doctor
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/signup/doctor")}
              >
                Sign Up
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
