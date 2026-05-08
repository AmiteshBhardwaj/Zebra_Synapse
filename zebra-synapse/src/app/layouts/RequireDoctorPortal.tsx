import { Navigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ConfigRequired, ProfileMissing } from "../components/ConfigRequired";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";

export default function RequireDoctorPortal() {
  const { user, profile, loading, configured } = useAuth();

  if (!configured) return <ConfigRequired />;
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#92a8c7]">Loading...</div>;
  }
  if (!user) return <Navigate to="/login/doctor" replace />;
  if (!profile) return <ProfileMissing />;
  if (profile.role === "patient") return <Navigate to="/patient" replace />;
  if (profile.role !== "doctor") return <Navigate to="/" replace />;

  return <DoctorDashboard />;
}
