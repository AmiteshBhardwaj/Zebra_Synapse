import { useState } from "react";
import { ShieldCheck, Lock, FileText, Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type ModalType = "privacy" | "terms" | "hipaa" | "contact" | null;

export default function FooterLegalModals() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    category: "General Inquiry",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Thank you for contacting Zebra Synapse! Our support team will get back to you within 24 hours.");
      setContactForm({
        name: "",
        email: "",
        category: "General Inquiry",
        message: "",
      });
      setActiveModal(null);
    }, 800);
  };

  return (
    <>
      {/* Footer Navigation Buttons */}
      <nav className="flex flex-wrap justify-center gap-4 font-mono">
        <button
          type="button"
          onClick={() => setActiveModal("privacy")}
          className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100 text-[11px]"
        >
          Privacy Policy
        </button>
        <button
          type="button"
          onClick={() => setActiveModal("terms")}
          className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100 text-[11px]"
        >
          Terms of Service
        </button>
        <button
          type="button"
          onClick={() => setActiveModal("hipaa")}
          className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100 text-[11px]"
        >
          HIPAA Compliance
        </button>
        <button
          type="button"
          onClick={() => setActiveModal("contact")}
          className="text-[#dcc1b5] hover:text-[#ffb795] underline transition-all opacity-80 hover:opacity-100 text-[11px]"
        >
          Contact
        </button>
      </nav>

      {/* Shared Dialog Container */}
      <Dialog open={activeModal !== null} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0a1827] text-[#d4e4fa] border border-[#56433a]/60 shadow-2xl p-6 sm:p-7 rounded-xl scrollbar-thin">
          
          {/* PRIVACY POLICY MODAL */}
          {activeModal === "privacy" && (
            <div className="flex flex-col gap-5">
              <DialogHeader className="text-left border-b border-[#56433a]/50 pb-4">
                <div className="flex items-center gap-2 text-[#ffb795] text-xs font-mono mb-1">
                  <Lock className="h-4 w-4" />
                  <span>Zero-Knowledge Encrypted Standard</span>
                </div>
                <DialogTitle className="text-2xl font-bold text-[#ffb795] font-['Manrope']">
                  Privacy Policy
                </DialogTitle>
                <DialogDescription className="text-xs text-[#dcc1b5] mt-1 font-mono">
                  Effective Date: August 11, 2026 | Zebra Synapse Medical Intelligence
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs sm:text-sm text-[#cbdbe8] leading-relaxed">
                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff8e53]" />
                    1. Data Encryption & Storage Architecture
                  </h4>
                  <p className="text-[#9eb4cd]">
                    All Protected Health Information (PHI), medical vitals, laboratory diagnostic Extractions, and doctor-patient messages are secured with <strong>AES-256-GCM encryption at rest</strong> and <strong>TLS 1.3 in transit</strong>. Cryptographic keys are managed inside dedicated Hardware Security Modules (HSM) with strictly enforced zero-trust access controls.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#60d4ff]" />
                    2. Information Collected & Clinical Usage
                  </h4>
                  <p className="text-[#9eb4cd]">
                    We collect patient demographic records, diagnostic lab reports, clinical appointment schedules, and continuous vital telemetry (heart rate, blood pressure, oxygen saturation). This data is processed exclusively to deliver AI-assisted clinical insights, risk stratification, and seamless care coordination between patients and credentialed physicians.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7af0c2]" />
                    3. Patient Data Control & Portability
                  </h4>
                  <p className="text-[#9eb4cd]">
                    Patients maintain 100% ownership over their medical records. You may request complete data exports in standardized HL7/FHIR formats or request permanent deletion of non-regulatory clinical logs under applicable CCPA, GDPR, and HIPAA data rights guidelines.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9f8cff]" />
                    4. Third-Party Disclosures & Non-Sale Pledge
                  </h4>
                  <p className="text-[#9eb4cd]">
                    Zebra Synapse <strong>never sells, monetizes, or shares patient health data</strong> with advertisers or third-party brokers. Data transfers occur strictly with verified healthcare institutions, authorized diagnostic laboratories, and credentialed care providers designated by the patient.
                  </p>
                </section>

                <div className="bg-[#122338] border border-[#ff8e53]/30 rounded-lg p-3 text-[11px] font-mono text-[#ffb795] flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#ff8e53] mt-0.5" />
                  <span>
                    Questions about data privacy? Contact our Data Protection Officer directly at <strong className="underline">privacy@zebrasynapse.health</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TERMS OF SERVICE MODAL */}
          {activeModal === "terms" && (
            <div className="flex flex-col gap-5">
              <DialogHeader className="text-left border-b border-[#56433a]/50 pb-4">
                <div className="flex items-center gap-2 text-[#60d4ff] text-xs font-mono mb-1">
                  <FileText className="h-4 w-4" />
                  <span>Clinical Operating Agreement</span>
                </div>
                <DialogTitle className="text-2xl font-bold text-[#ffb795] font-['Manrope']">
                  Terms of Service
                </DialogTitle>
                <DialogDescription className="text-xs text-[#dcc1b5] mt-1 font-mono">
                  Version 4.2 | Last Revised: January 2026
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs sm:text-sm text-[#cbdbe8] leading-relaxed">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-[11px] font-mono text-red-200">
                  <strong className="text-red-400 block mb-1">⚠️ EMERGENCY MEDICAL DISCLAIMER</strong>
                  Zebra Synapse is an analytical intelligence platform designed for decision support and care management. IT IS NOT AN EMERGENCY RESPONSE SYSTEM. If you are experiencing a medical emergency, call 911 or proceed to the nearest emergency room immediately.
                </div>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#60d4ff]" />
                    1. Platform Access & Role Qualifications
                  </h4>
                  <p className="text-[#9eb4cd]">
                    Access to Patient and Doctor Portals is restricted to verified individuals. Physicians must maintain active, unencumbered medical licenses in their operating jurisdictions. Patients must provide accurate identification to ensure authentic medical record linkage.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff8e53]" />
                    2. Clinical Intelligence & AI Assistance
                  </h4>
                  <p className="text-[#9eb4cd]">
                    AI-powered diagnostic recommendations, biomarker extractions, and disease predictions serve as supplementary clinical decision support aids. Final medical diagnoses, treatment plans, and drug prescriptions remain the sole responsibility of licensed attending physicians.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7af0c2]" />
                    3. Account Security & Credential Stewardship
                  </h4>
                  <p className="text-[#9eb4cd]">
                    Users are responsible for protecting account credentials and enabling multi-factor authentication (MFA). Account sharing across multiple unauthorized clinical staff members is strictly prohibited under our system security policy.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9f8cff]" />
                    4. Service Level Agreement (SLA)
                  </h4>
                  <p className="text-[#9eb4cd]">
                    Zebra Synapse guarantees a 99.9% operational uptime SLA for critical portal services. Scheduled maintenance windows occur during low-volume hours with prior notice issued via system announcements.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* HIPAA COMPLIANCE MODAL */}
          {activeModal === "hipaa" && (
            <div className="flex flex-col gap-5">
              <DialogHeader className="text-left border-b border-[#56433a]/50 pb-4">
                <div className="flex items-center gap-2 text-[#7af0c2] text-xs font-mono mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>SOC 2 Type II & BAA Certified Architecture</span>
                </div>
                <DialogTitle className="text-2xl font-bold text-[#ffb795] font-['Manrope']">
                  HIPAA Compliance Statement
                </DialogTitle>
                <DialogDescription className="text-xs text-[#dcc1b5] mt-1 font-mono">
                  Health Insurance Portability and Accountability Act (HIPAA) Standards
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs sm:text-sm text-[#cbdbe8] leading-relaxed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono mb-2">
                  <div className="bg-[#122338] p-2.5 rounded-lg border border-[#7af0c2]/20 flex items-center gap-2 min-w-0 overflow-hidden">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7af0c2]" />
                    <span className="leading-tight break-words">Business Associate Agreement (BAA) Signed</span>
                  </div>
                  <div className="bg-[#122338] p-2.5 rounded-lg border border-[#7af0c2]/20 flex items-center gap-2 min-w-0 overflow-hidden">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7af0c2]" />
                    <span className="leading-tight break-words">Immutable Audit Trails</span>
                  </div>
                </div>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7af0c2]" />
                    1. Administrative Safeguards
                  </h4>
                  <p className="text-[#9eb4cd]">
                    We enforce comprehensive security management processes, including routine risk assessments, mandatory employee HIPAA training, role-based access control policies, and designated Security and Privacy Officers overseeing platform operations.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#60d4ff]" />
                    2. Physical & Infrastructure Safeguards
                  </h4>
                  <p className="text-[#9eb4cd]">
                    All data hosting environment infrastructure resides inside SOC 1, SOC 2 Type II, and ISO 27001 certified tier-4 data centers featuring biometrics, 24/7 physical security guards, biometric access barriers, and geographic disaster recovery redundancy.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff8e53]" />
                    3. Technical Safeguards & Audit Logs
                  </h4>
                  <p className="text-[#9eb4cd]">
                    Our technical safeguards include automatic user session timeouts, real-time intrusion prevention systems (IPS), end-to-end data encryption, and immutable audit logging that tracks every single PHI access attempt with timestamp, IP address, and clinician ID.
                  </p>
                </section>

                <section>
                  <h4 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9f8cff]" />
                    4. Breach Notification Protocol
                  </h4>
                  <p className="text-[#9eb4cd]">
                    In the unlikely event of a security incident affecting PHI, Zebra Synapse commits to notifying covered entity partners and impacted individuals within 24 hours of discovery, fully adhering to HITECH Act breach notification guidelines.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* CONTACT MODAL */}
          {activeModal === "contact" && (
            <div className="flex flex-col gap-5">
              <DialogHeader className="text-left border-b border-[#56433a]/50 pb-4">
                <div className="flex items-center gap-2 text-[#ffb795] text-xs font-mono mb-1">
                  <Mail className="h-4 w-4" />
                  <span>24/7 Enterprise Clinical & Technical Support</span>
                </div>
                <DialogTitle className="text-2xl font-bold text-[#ffb795] font-['Manrope']">
                  Contact Us
                </DialogTitle>
                <DialogDescription className="text-xs text-[#dcc1b5] mt-1 font-mono">
                  Get in touch with Zebra Synapse Clinical Support & Compliance
                </DialogDescription>
              </DialogHeader>

              {/* Direct Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="bg-[#122338] p-3 rounded-lg border border-[#56433a]/40 flex flex-col gap-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[#ffb795] min-w-0">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-semibold truncate">Hotline</span>
                  </div>
                  <span className="text-[#9eb4cd] text-[11px] truncate">+1 (800) 555-ZEBRA</span>
                </div>

                <div className="bg-[#122338] p-3 rounded-lg border border-[#56433a]/40 flex flex-col gap-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[#60d4ff] min-w-0">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-semibold truncate">Email Desk</span>
                  </div>
                  <span className="text-[#9eb4cd] text-[10px] leading-tight break-all font-mono">
                    support@zebrasynapse.health
                  </span>
                </div>

                <div className="bg-[#122338] p-3 rounded-lg border border-[#56433a]/40 flex flex-col gap-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[#7af0c2] min-w-0">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-semibold truncate">Headquarters</span>
                  </div>
                  <span className="text-[#9eb4cd] text-[11px] leading-tight break-words">San Francisco, CA 94107</span>
                </div>
              </div>

              {/* Interactive Contact Form */}
              <form onSubmit={handleContactSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="contact-name" className="text-[11px] font-mono text-[#dcc1b5]">
                      Full Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Dr. Alex Morgan"
                      className="bg-[#0d1c2d] border border-[#56433a] rounded-md px-3 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#ffb795]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor="contact-email" className="text-[11px] font-mono text-[#dcc1b5]">
                      Email Address *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="alex.morgan@hospital.org"
                      className="bg-[#0d1c2d] border border-[#56433a] rounded-md px-3 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#ffb795]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="contact-category" className="text-[11px] font-mono text-[#dcc1b5]">
                    Inquiry Category
                  </label>
                  <select
                    id="contact-category"
                    value={contactForm.category}
                    onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                    className="bg-[#0d1c2d] border border-[#56433a] rounded-md px-3 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#ffb795]"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Patient Portal Support">Patient Portal Support</option>
                    <option value="Doctor/Clinical Network Onboarding">Doctor / Clinical Network Onboarding</option>
                    <option value="HIPAA / Security Officer Desk">HIPAA / Security Officer Desk</option>
                    <option value="Technical Bug Report">Technical Bug Report</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="contact-message" className="text-[11px] font-mono text-[#dcc1b5]">
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Describe how our support team can assist you..."
                    className="bg-[#0d1c2d] border border-[#56433a] rounded-md px-3 py-1.5 text-xs text-[#d4e4fa] focus:outline-none focus:border-[#ffb795] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-2.5 bg-[#ffb795] text-[#562000] hover:bg-[#ffdbcc] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 mt-1 shadow-[0_0_15px_rgba(255,183,149,0.3)]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sending ? "Sending Inquiry..." : "Submit Inquiry"}</span>
                </button>
              </form>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
