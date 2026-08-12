import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Video, ArrowLeft, ShieldCheck, Clock, UserCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import VideoCall from "../../components/teleconsult/VideoCall";
import RealtimeNote from "../../components/teleconsult/RealtimeNote";
import {
  PatientPortalPage,
  PatientPageHero,
  portalPanelClass,
  portalSecondaryButtonClass,
  StatusPill,
} from "../../components/patient/PortalTheme";

export default function PatientTeleconsult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const consultationId = searchParams.get("id") || "demo-consult-123";
  const doctorName = searchParams.get("doctor") || "Dr. Amelia Hart";
  const specialty = searchParams.get("specialty") || "Internal Medicine & Primary Care";

  const [callActive, setCallActive] = useState(true);

  return (
    <PatientPortalPage>
      <PatientPageHero
        eyebrow="Virtual Care Room"
        title={`Teleconsultation with ${doctorName}`}
        description="Encrypted end-to-end HD video consultation session with your physician. Review real-time clinical notes below."
        icon={Video}
        actions={
          <Button
            variant="outline"
            className={portalSecondaryButtonClass}
            onClick={() => navigate("/patient/appointments")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Appointments
          </Button>
        }
        meta={[
          { label: "Provider", value: doctorName },
          { label: "Specialty", value: specialty },
          { label: "Status", value: <StatusPill status={callActive ? "In-Progress" : "Completed"} /> },
          { label: "Security", value: <span className="flex items-center gap-1.5 text-emerald-400"><ShieldCheck className="h-4 w-4" /> Peer-to-Peer</span> },
        ]}
      />

      {callActive ? (
        <section className="space-y-6">
          <VideoCall
            consultationId={consultationId}
            role="PATIENT"
            onLeave={() => setCallActive(false)}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RealtimeNote consultationId={consultationId} />
            </div>

            <div className={`${portalPanelClass} p-6 space-y-4`}>
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm tracking-wide uppercase font-mono">
                <Clock className="h-4 w-4" />
                <span>Session Guidelines</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Ensure your camera and microphone are enabled in your browser settings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Use headphones to prevent audio echo during the consultation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Your doctor can update clinical notes live during or after the call.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      ) : (
        <div className={`${portalPanelClass} p-10 text-center space-y-5 max-w-xl mx-auto my-8`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto">
            <UserCheck className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Consultation Completed</h2>
          <p className="text-sm text-slate-300">
            Thank you for attending your video consultation with {doctorName}. Your appointment status has been updated.
          </p>
          <div className="pt-2 flex justify-center gap-4">
            <Button
              className="border-transparent bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-500 text-slate-950 font-semibold"
              onClick={() => navigate("/patient/appointments")}
            >
              Return to Appointments
            </Button>
          </div>
        </div>
      )}
    </PatientPortalPage>
  );
}
