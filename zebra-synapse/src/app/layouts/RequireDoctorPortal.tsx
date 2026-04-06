import { Navigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ConfigRequired, ProfileMissing } from "../components/ConfigRequired";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";

export default function RequireDoctorPortal() {
  const { user, profile, loading, configured } = useAuth();

  if (!configured) return <ConfigRequired />;
  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,_rgba(108,91,212,0.18),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(255,106,0,0.14),_transparent_24%),linear-gradient(180deg,#121212_0%,#0a0a0f_100%)] flex items-center justify-center text-white/60 text-sm">
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
