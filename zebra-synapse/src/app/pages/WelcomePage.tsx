import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ExternalLink,
  UserCheck,
  Stethoscope,
  ArrowRight,
  Activity,
  BrainCircuit,
  ShieldCheck,
  Lock,
  FileCheck,
  ChevronDown,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { DnaCanvas3D } from "../components/DnaCanvas3D";
import { GlassmorphicLoginCard } from "../components/GlassmorphicLoginCard";

const signalCards = [
  {
    code: "01",
    label: "STRUCTURED PANELS",
    value: "Lab uploads become usable biomarkers",
    icon: Activity,
    cardStyle: "bg-slate-950/40 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/60",
    containerStyle: "rounded-xl bg-gradient-to-br from-cyan-950/70 to-slate-900/80 border border-cyan-500/25",
    iconStyle: "text-cyan-400",
    isFeatured: false,
  },
  {
    code: "02",
    label: "AI SIGNAL",
    value: "Insights stay visible, not buried",
    icon: BrainCircuit,
    cardStyle: "bg-[#090b12] border-sky-400/40 shadow-md shadow-sky-950/30 hover:border-sky-300/60 hover:bg-slate-900/80 sm:scale-[1.02]",
    containerStyle: "rounded-full bg-gradient-to-br from-sky-950/90 to-indigo-950/70 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.3)]",
    iconStyle: "text-sky-300",
    isFeatured: true,
  },
  {
    code: "03",
    label: "TRUST LAYER",
    value: "Shared patient-doctor workspace",
    icon: ShieldCheck,
    cardStyle: "bg-slate-950/40 border-slate-800/80 hover:border-teal-500/40 hover:bg-slate-900/60",
    containerStyle: "rounded-xl bg-gradient-to-br from-teal-950/60 to-slate-900/80 border border-teal-500/25",
    iconStyle: "text-teal-400",
    isFeatured: false,
  },
] as const;

export default function WelcomePage() {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = Math.min(
          1,
          Math.max(0, window.scrollY / totalScroll)
        );
        setScrollProgress(currentProgress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute key transition opacity/transform parameters (or fallback for reduced motion)
  const heroOpacity = prefersReducedMotion ? 1 : Math.max(0, 1 - scrollProgress * 2.2);
  const heroScale = prefersReducedMotion ? 1 : 1 - scrollProgress * 0.15;
  const loginOpacity = prefersReducedMotion ? 1 : Math.min(1, Math.max(0, (scrollProgress - 0.45) * 2.2));
  const loginScale = prefersReducedMotion ? 1 : 0.88 + Math.min(0.12, scrollProgress * 0.12);

  return (
    <div className="relative min-h-[250vh] bg-[#06070a] text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
        
        {/* Dynamic Restrained Background Aura */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#06070a]" />

          {/* Muted Radial Light Halos */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.08)_0%,rgba(99,102,241,0.02)_45%,transparent_75%)] blur-3xl rounded-full transition-opacity duration-500"
            style={{ opacity: prefersReducedMotion ? 0.7 : 1 - scrollProgress * 0.5 }}
          />

          {/* Sparse Clinical Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
        </div>

        {/* 3D WebGL Double Helix Layer */}
        <DnaCanvas3D progress={scrollProgress} />

        {/* Top Navigation Bar — Asymmetric Minimal Header */}
        <header className="relative z-30 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full shrink-0">
          {/* Top-Left Brand Logo */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#38bdf8]" />
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-slate-300 font-semibold group-hover:text-cyan-300 transition-colors">
              Zebra Synapse
            </span>
          </div>

          {/* Top-Right Direct Portal Shortcut */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070a]"
              title="Gateway for registered patient & clinician sessions"
            >
              <span>Direct Portal</span>
              <span className="hidden sm:inline-block text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded font-mono">
                Session
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
            </button>
          </div>
        </header>

        {/* Main Hero & Workspace Content Area — Two-Column Desktop Grid */}
        <main className="relative z-20 flex-1 flex flex-col justify-center px-6 lg:px-12 max-w-7xl mx-auto min-h-0 py-2 w-full">
          
          {/* STATE 1: Hero Content */}
          <div
            className="w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center transition-all duration-300"
            style={{
              opacity: heroOpacity,
              transform: `scale(${heroScale})`,
              pointerEvents: heroOpacity > 0.4 ? "auto" : "none",
              display: !prefersReducedMotion && heroOpacity <= 0.05 ? "none" : "grid",
            }}
          >
            {/* LEFT COLUMN: Editorial Hero Copy & Actions (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Eyebrow Badge */}
              <div className="text-cyan-400 font-mono text-[11px] tracking-[0.2em] uppercase mb-2.5 font-semibold">
                CLINICAL INTELLIGENCE PLATFORM
              </div>

              {/* Main Editorial Headline — WCAG AA High Contrast */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.08] font-['Manrope']">
                Clinical intelligence, <br />
                <span className="text-cyan-400 font-extrabold">from lab data to care.</span>
              </h1>

              {/* Supporting Description */}
              <p className="mt-3.5 text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                Transform complex lab data into structured biomarkers, longitudinal insights, and actionable clinical workflows.
              </p>

              {/* Left-Aligned Portal Entry Buttons — Tightened Rhythm */}
              <div className="flex flex-row items-center justify-start gap-3.5 my-5 w-full">
                <Button
                  className="h-10 sm:h-11 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070a]"
                  onClick={() => navigate("/login/patient")}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Patient Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  className="h-10 sm:h-11 px-5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070a]"
                  onClick={() => navigate("/login/doctor")}
                >
                  <Stethoscope className="h-4 w-4" />
                  <span>Doctor Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Clinical Trust & Compliance Signal Row — Warm Sans-Serif with Thin Dividers */}
              <div className="flex items-center flex-wrap gap-3.5 text-[11px] font-sans text-slate-300 mb-5 select-none font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  HIPAA Compliant
                </span>
                <span className="w-px h-3.5 bg-slate-800 opacity-80" />
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-cyan-400" />
                  SOC 2 Type II
                </span>
                <span className="w-px h-3.5 bg-slate-800 opacity-80" />
                <span className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Enterprise Encryption
                </span>
              </div>

              {/* Varied Feature Capability Strip — Distinct Hierarchy */}
              <div className="grid gap-3.5 sm:grid-cols-3 w-full text-left pt-1">
                {signalCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`p-3.5 rounded-xl backdrop-blur-md flex items-center gap-3.5 transition-all duration-200 cursor-default h-full ${item.cardStyle}`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center ${item.containerStyle}`}>
                        <Icon className={`h-4 w-4 ${item.iconStyle}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] tracking-wider uppercase text-slate-400 font-semibold font-sans whitespace-nowrap">
                          <span className="font-mono text-[9px] text-cyan-400/90 mr-1.5 font-normal">{item.code}</span>
                          {item.label}
                        </p>
                        <p className="text-xs font-medium text-slate-200 leading-tight mt-0.5">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: Dedicated 3D Stage Space Placeholder (lg:col-span-5) */}
            <div className="hidden lg:block lg:col-span-5 h-[480px] pointer-events-none relative" />
          </div>

          {/* STATE 2: Revealed Embedded Glassmorphic Login Card (Emerges on Scroll) */}
          {!prefersReducedMotion && (
            <div
              className="absolute inset-0 flex items-center justify-center px-4 transition-all duration-300 pointer-events-none"
              style={{
                opacity: loginOpacity,
                transform: `scale(${loginScale})`,
                pointerEvents: loginOpacity > 0.6 ? "auto" : "none",
                display: loginOpacity <= 0.02 ? "none" : "flex",
              }}
            >
              <GlassmorphicLoginCard />
            </div>
          )}
        </main>

        {/* Scroll Indicator Prompt & Footer */}
        <footer className="relative z-30 border-t border-slate-800/40 bg-[#06070a]/80 backdrop-blur-md py-2.5 px-6 text-center text-[11px] text-[#64748b] font-mono shrink-0 flex items-center justify-between">
          <div>© 2026 Zebra Synapse Health. Enterprise Clinical Infrastructure.</div>

          {/* Dynamic Scroll Prompt */}
          {!prefersReducedMotion && (
            <>
              <div
                className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase tracking-wider transition-opacity duration-300"
                style={{ opacity: Math.max(0, 1 - scrollProgress * 1.5) }}
              >
                <span className="hidden sm:inline">SCROLL TO EXPLORE</span>
                <ChevronDown className="h-3.5 w-3.5 animate-bounce text-cyan-400" />
              </div>

              <div
                className="flex items-center gap-1.5 text-cyan-300 font-mono text-[10px] uppercase tracking-wider transition-opacity duration-300"
                style={{ opacity: Math.min(1, Math.max(0, (scrollProgress - 0.7) * 3.3)) }}
              >
                <span>DNA UNLOCKED • GATEWAY ACTIVE</span>
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
