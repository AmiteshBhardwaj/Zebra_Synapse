import { Navigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ConfigRequired, ProfileMissing } from "../components/ConfigRequired";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";

export default function RequireDoctorPortal() {
  const { user, profile, loading, configured } = useAuth();

  if (!configured) return <ConfigRequired />;
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login/doctor" replace />;
  if (!profile) return <ProfileMissing />;
  if (profile.role === "patient")
    return <Navigate to="/patient" replace />;
  if (profile.role !== "doctor") return <Navigate to="/" replace />;

  return <DoctorDashboard />;
}
