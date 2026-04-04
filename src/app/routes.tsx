import { createBrowserRouter } from "react-router";
import WelcomePage from "./pages/WelcomePage";
import PatientLogin from "./pages/auth/PatientLogin";
import PatientSignup from "./pages/auth/PatientSignup";
import DoctorLogin from "./pages/auth/DoctorLogin";
import DoctorSignup from "./pages/auth/DoctorSignup";
import PatientHome from "./pages/patient/PatientHome";
import MedicalRecords from "./pages/patient/MedicalRecords";
import Appointments from "./pages/patient/Appointments";
import Vitals from "./pages/patient/Vitals";
import Prescription from "./pages/patient/Prescription";
import DiseasePrediction from "./pages/patient/DiseasePrediction";
import Nutrition from "./pages/patient/Nutrition";
import ClinicalTrials from "./pages/patient/ClinicalTrials";
import WellnessTips from "./pages/patient/WellnessTips";
import PatientsList from "./pages/doctor/PatientsList";
import PatientDetail from "./pages/doctor/PatientDetail";
import RequirePatientPortal from "./layouts/RequirePatientPortal";
import RequireDoctorPortal from "./layouts/RequireDoctorPortal";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: WelcomePage,
  },
  {
    path: "/login/patient",
    Component: PatientLogin,
  },
  {
    path: "/signup/patient",
    Component: PatientSignup,
  },
  {
    path: "/login/doctor",
    Component: DoctorLogin,
  },
  {
    path: "/signup/doctor",
    Component: DoctorSignup,
  },
  {
    path: "/patient",
    Component: RequirePatientPortal,
    children: [
      { index: true, Component: PatientHome },
      { path: "medical-records", Component: MedicalRecords },
      { path: "appointments", Component: Appointments },
      { path: "vitals", Component: Vitals },
      { path: "prescription", Component: Prescription },
      { path: "disease-prediction", Component: DiseasePrediction },
      { path: "nutrition", Component: Nutrition },
      { path: "clinical-trials", Component: ClinicalTrials },
      { path: "wellness-tips", Component: WellnessTips },
    ],
  },
  {
    path: "/doctor",
    Component: RequireDoctorPortal,
    children: [
      { index: true, Component: PatientsList },
      { path: "patient/:patientId", Component: PatientDetail },
    ],
  },
]);
