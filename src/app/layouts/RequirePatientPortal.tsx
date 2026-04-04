import { Navigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ConfigRequired, ProfileMissing } from "../components/ConfigRequired";
import PatientDashboard from "../pages/patient/PatientDashboard";

export default function RequirePatientPortal() {
  const { user, profile, loading, configured } = useAuth();

  if (!configured) return <ConfigRequired />;
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login/patient" replace />;
  if (!profile) return <ProfileMissing />;
  if (profile.role === "doctor")
    return <Navigate to="/doctor" replace />;
  if (profile.role !== "patient") return <Navigate to="/" replace />;

  return <PatientDashboard />;
}
