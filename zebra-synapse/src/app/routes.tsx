import { createBrowserRouter } from "react-router";
import WelcomePage from "./pages/WelcomePage";
import DualLogin from "./pages/auth/DualLogin";
import PatientLogin from "./pages/auth/PatientLogin";
import PatientSignup from "./pages/auth/PatientSignup";
import DoctorLogin from "./pages/auth/DoctorLogin";
import DoctorSignup from "./pages/auth/DoctorSignup";
import PatientHome from "./pages/patient/PatientHome";
import MedicalRecords from "./pages/patient/MedicalRecordsInsights";
import Appointments from "./pages/patient/Appointments";
import Prescription from "./pages/patient/Prescription";
import DiseasePrediction from "./pages/patient/DiseasePredictionInsights";
import Diet from "./pages/patient/DietInsights";
import Nutrition from "./pages/patient/NutritionInsights";
import ExercisePlan from "./pages/patient/ExercisePlanInsights";
import ClinicalTrials from "./pages/patient/ClinicalTrialsInsights";
import WellnessTips from "./pages/patient/WellnessTipsInsights";
import ProfileSettings from "./pages/ProfileSettings";
import PatientsList from "./pages/doctor/PatientsList";
import PatientDetail from "./pages/doctor/PatientDetail";
import RequirePatientPortal from "./layouts/RequirePatientPortal";
import RequireDoctorPortal from "./layouts/RequireDoctorPortal";

import PatientTeleconsult from "./pages/patient/PatientTeleconsult";
import DoctorTeleconsult from "./pages/doctor/DoctorTeleconsult";

import PatientLabChat from "./pages/patient/PatientLabChat";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: WelcomePage,
  },
  {
    path: "/login",
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
      { path: "ai-chat", Component: PatientLabChat },
      { path: "lab-chat", Component: PatientLabChat },
      { path: "appointments", Component: Appointments },
      { path: "teleconsult", Component: PatientTeleconsult },
      { path: "prescription", Component: Prescription },
      { path: "disease-prediction", Component: DiseasePrediction },
      { path: "diet", Component: Diet },
      { path: "nutrition", Component: Nutrition },
      { path: "exercise", Component: ExercisePlan },
      { path: "clinical-trials", Component: ClinicalTrials },
      { path: "wellness-tips", Component: WellnessTips },
      { path: "settings", Component: ProfileSettings },
    ],
  },
  {
    path: "/doctor",
    Component: RequireDoctorPortal,
    children: [
      { index: true, Component: PatientsList },
      { path: "teleconsult", Component: DoctorTeleconsult },
      { path: "settings", Component: ProfileSettings },
      { path: "patient/:patientId", Component: PatientDetail },
    ],
  },
]);
