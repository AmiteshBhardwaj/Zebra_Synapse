import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ExternalLink,
  Plus,
  Frame,
  Sparkles,
  MousePointer,
  Globe,
  UserCheck,
  Stethoscope,
  ArrowRight,
  Activity,
  BrainCircuit,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { DnaCanvas3D } from "../components/DnaCanvas3D";
import { GlassmorphicLoginCard } from "../components/GlassmorphicLoginCard";

const signalCards = [
  {
    label: "Structured panels",
    value: "Lab uploads become usable biomarkers",
    icon: Activity,
  },
  {
    label: "AI signal",
    value: "Insights stay visible, not buried",
    icon: BrainCircuit,
  },
  {
    label: "Trust layer",
    value: "Shared patient-doctor workspace",
    icon: ShieldCheck,
  },
] as const;

export default function WelcomePage() {
  const navigate = useNavigate();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
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
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute key transition opacity/transform parameters
  const heroOpacity = Math.max(0, 1 - scrollProgress * 2.2);
  const heroScale = 1 - scrollProgress * 0.15;
  const loginOpacity = Math.min(1, Math.max(0, (scrollProgress - 0.45) * 2.2));
  const loginScale = 0.85 + Math.min(0.15, scrollProgress * 0.15);

  return (
    <div className="relative min-h-[260vh] bg-black text-white font-['Manrope',sans-serif] selection:bg-[#60d4ff]/30">
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
        
        {/* Dynamic Background Grid & Ambient Aura */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-black" />
          <div className="clinical-grid absolute inset-0 opacity-[0.05]" />

          {/* Dual Dynamic Glowing Halos */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(0,140,255,0.22)_0%,rgba(0,80,200,0.08)_45%,rgba(0,0,0,0)_75%)] blur-3xl rounded-full transition-opacity duration-500"
            style={{ opacity: 1 - scrollProgress * 0.5 }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(255,142,83,0.2)_0%,rgba(255,80,0,0.05)_50%,rgba(0,0,0,0)_80%)] blur-3xl rounded-full transition-opacity duration-500"
            style={{ opacity: scrollProgress }}
          />
        </div>

        {/* 3D WebGL Spinning & Unzipping DNA Layer */}
        <DnaCanvas3D progress={scrollProgress} />

        {/* Top Header Navigation */}
        <header className="relative z-30 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full shrink-0">
          <div className="w-10 sm:w-24" />

          {/* Centered Zebra Synapse Logo */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ff7a33,#60d4ff)] shadow-[0_0_18px_rgba(96,212,255,0.4)] transition-transform group-hover:scale-105">
              <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-white/90 block leading-none">
                Zebra Synapse
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#60d4ff] font-mono block mt-0.5">
                Clinical Intelligence
              </span>
            </div>
          </div>

          {/* Top Right Direct Login Shortcut */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/40 flex items-center justify-center gap-2 text-xs font-semibold"
              title="Open Direct Portal Gateway"
            >
              <span className="hidden sm:inline">Direct Portal</span>
              <ExternalLink className="h-3.5 w-3.5 text-white/90" />
            </button>
          </div>
        </header>

        {/* Main Content Area - Transitions between Hero Info & Login Reveal */}
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 max-w-5xl mx-auto text-center min-h-0 py-2 w-full">
          
          {/* STATE 1: Hero Content (Visible at top scroll) */}
          <div
            className="flex flex-col items-center justify-center transition-all duration-300 w-full"
            style={{
              opacity: heroOpacity,
              transform: `scale(${heroScale})`,
              pointerEvents: heroOpacity > 0.4 ? "auto" : "none",
              display: heroOpacity <= 0.05 ? "none" : "flex",
            }}
          >
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12] max-w-3xl shrink-0">
              The clinical canvas <br />
              with built-in intelligence
            </h1>

            <p className="mt-3 text-sm sm:text-base text-white/70 max-w-xl">
              Next-generation health AI workspace bridging patient diagnostics with physician insights.
            </p>

            {/* Glowing 3D Glassmorphic Icon Array Canvas */}
            <div className="relative my-4 sm:my-6 w-full max-w-2xl flex items-center justify-center shrink-0">
              <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 md:gap-8 p-3.5 sm:p-5 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-[0_0_40px_rgba(0,140,255,0.15)]">
                <div className="group relative flex items-center justify-center h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.15),rgba(0,102,255,0.05))] border border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.4)] backdrop-blur-xl">
                  <Plus strokeWidth={2.5} className="h-5 w-5 sm:h-6 sm:w-6 text-sky-200" />
                </div>
                <div className="group relative flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.2),rgba(0,102,255,0.08))] border border-sky-300/50 shadow-[0_0_25px_rgba(56,189,248,0.5)] backdrop-blur-xl">
                  <Frame strokeWidth={2.5} className="h-6 w-6 sm:h-7 sm:w-7 text-sky-200" />
                </div>
                <div className="group relative flex items-center justify-center h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl bg-[linear-gradient(135deg,rgba(56,189,248,0.35),rgba(0,102,255,0.18))] border-2 border-sky-200/70 shadow-[0_0_40px_rgba(56,189,248,0.85)] backdrop-blur-2xl">
                  <Sparkles strokeWidth={2} className="h-7 w-7 sm:h-10 sm:w-10 text-white animate-pulse" />
                </div>
                <div className="group relative flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.2),rgba(0,102,255,0.08))] border border-sky-300/50 shadow-[0_0_25px_rgba(56,189,248,0.5)] backdrop-blur-xl">
                  <MousePointer strokeWidth={2.5} className="h-6 w-6 sm:h-7 sm:w-7 text-sky-200" />
                </div>
                <div className="group relative flex items-center justify-center h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.15),rgba(0,102,255,0.05))] border border-sky-400/40 shadow-[0_0_20px_rgba(56,189,248,0.4)] backdrop-blur-xl">
                  <Globe strokeWidth={2.5} className="h-5 w-5 sm:h-6 sm:w-6 text-sky-200" />
                </div>
              </div>
            </div>

            {/* Quick Action Portal Entry Buttons */}
            <div className="flex flex-row items-center justify-center gap-3 w-full max-w-md shrink-0 mb-4">
              <Button
                className="h-10 sm:h-11 px-5 rounded-xl bg-[#ff8e53] text-[#3d1300] hover:bg-[#ff9d66] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(255,142,83,0.35)] transition-all flex items-center justify-center gap-1.5"
                onClick={() => navigate("/login/patient")}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Patient Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>

              <Button
                className="h-10 sm:h-11 px-5 rounded-xl bg-[#60d4ff] text-[#002b3d] hover:bg-[#85deff] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(96,212,255,0.35)] transition-all flex items-center justify-center gap-1.5"
                onClick={() => navigate("/login/doctor")}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Doctor Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Compact Feature Signal Badges */}
            <div className="grid gap-3 sm:grid-cols-3 w-full max-w-3xl text-left shrink-0">
              {signalCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-md shadow-md flex items-center gap-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/10">
                      <Icon className="h-4 w-4 text-sky-300" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/40 font-mono">
                        {item.label}
                      </p>
                      <p className="text-xs font-medium text-white/90 leading-tight">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STATE 2: Revealed Embedded Glassmorphic Login Card (Emerges on Scroll) */}
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
        </main>

        {/* Scroll Indicator Prompt & Footer */}
        <footer className="relative z-30 border-t border-white/10 bg-black/70 backdrop-blur-md py-2.5 px-6 text-center text-[11px] text-white/40 font-mono shrink-0 flex items-center justify-between">
          <span>© 2026 Zebra Synapse — Encrypted Clinical Workspace</span>

          {/* Dynamic Scroll Prompt */}
          <div
            className="flex items-center gap-1.5 text-[#60d4ff] font-mono text-[10px] uppercase tracking-wider transition-opacity duration-300"
            style={{ opacity: Math.max(0, 1 - scrollProgress * 1.5) }}
          >
            <span className="hidden sm:inline">Scroll to unzip DNA & enter portal</span>
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-[#60d4ff]" />
          </div>

          <div
            className="flex items-center gap-1.5 text-[#ff8e53] font-mono text-[10px] uppercase tracking-wider transition-opacity duration-300"
            style={{ opacity: Math.min(1, Math.max(0, (scrollProgress - 0.7) * 3.3)) }}
          >
            <span>Unzipped • Gateway Active</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
