import { useState, useEffect, useRef } from "react";
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
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const prompt1Ref = useRef<HTMLDivElement>(null);
  const prompt2Ref = useRef<HTMLDivElement>(null);

  const scrollProgressRef = useRef(0);

  const [cardTab, setCardTab] = useState<"patient" | "doctor">("patient");

  const scrollToLogin = (tab: "patient" | "doctor" = "patient") => {
    setCardTab(tab);
    const targetScroll = (document.documentElement.scrollHeight - window.innerHeight) * 0.85;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) return;

    const smoothstep = (min: number, max: number, value: number) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    const updateDOMTransforms = (progress: number) => {
      scrollProgressRef.current = progress;

      // 1. Hero fade-out, scale & subtle lift up
      if (heroRef.current) {
        const heroFactor = 1 - smoothstep(0.0, 0.42, progress);
        const heroScale = 1 - (1 - heroFactor) * 0.08;
        const heroY = (1 - heroFactor) * -35;

        heroRef.current.style.opacity = heroFactor.toFixed(3);
        heroRef.current.style.transform = `translateY(${heroY.toFixed(1)}px) scale(${heroScale.toFixed(3)})`;
        heroRef.current.style.pointerEvents = heroFactor > 0.3 ? "auto" : "none";
        heroRef.current.style.visibility = heroFactor < 0.005 ? "hidden" : "visible";
      }

      // 2. Login card smooth reveal over extended scroll track
      if (loginRef.current) {
        const loginFactor = smoothstep(0.32, 0.90, progress);
        const loginScale = 0.90 + loginFactor * 0.10;
        const loginY = (1 - loginFactor) * 45;

        loginRef.current.style.opacity = loginFactor.toFixed(3);
        loginRef.current.style.transform = `translateY(${loginY.toFixed(1)}px) scale(${loginScale.toFixed(3)})`;
        loginRef.current.style.pointerEvents = loginFactor > 0.4 ? "auto" : "none";
        loginRef.current.style.visibility = loginFactor < 0.005 ? "hidden" : "visible";
      }

      // 3. Aura opacity
      if (auraRef.current) {
        auraRef.current.style.opacity = (1 - progress * 0.4).toFixed(3);
      }

      // 4. Prompts opacity
      if (prompt1Ref.current) {
        prompt1Ref.current.style.opacity = (1 - smoothstep(0.0, 0.35, progress)).toFixed(3);
      }
      if (prompt2Ref.current) {
        prompt2Ref.current.style.opacity = smoothstep(0.55, 0.90, progress).toFixed(3);
      }
    };

    const scrollObj = { progress: 0 };

    const ctx = gsap.context(() => {
      gsap.to(scrollObj, {
        progress: 1,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: () => {
            updateDOMTransforms(scrollObj.progress);
          },
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-[320vh] bg-[#06070a] text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
        
        {/* Dynamic Multi-Layered Bioluminescent Background Atmosphere */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#04070d]" />

          {/* Multi-layered Volumetric Nebulae (Matching Reference Image) */}
          <div
            ref={auraRef}
            className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: prefersReducedMotion ? 0.7 : 1 }}
          >
            {/* Top-Left Bioluminescent Cyan Nebula */}
            <div className="absolute -top-[15%] -left-[10%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.16)_0%,rgba(14,165,233,0.05)_45%,transparent_75%)] blur-3xl rounded-full" />

            {/* Center-Right Electric Blue Halo */}
            <div className="absolute top-[25%] -right-[15%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] bg-[radial-gradient(ellipse_at_center,rgba(3,105,161,0.18)_0%,rgba(99,102,241,0.06)_45%,transparent_75%)] blur-3xl rounded-full" />

            {/* Bottom-Left Deep Navy Ambient Glow */}
            <div className="absolute -bottom-[20%] left-[10%] w-[75vw] h-[75vw] max-w-[950px] max-h-[950px] bg-[radial-gradient(ellipse_at_center,rgba(2,132,199,0.14)_0%,rgba(15,23,42,0.08)_50%,transparent_80%)] blur-3xl rounded-full" />
          </div>

          {/* Sparse Clinical Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        </div>

        {/* 3D WebGL Double Helix Layer */}
        <DnaCanvas3D progressRef={scrollProgressRef} />

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
              onClick={() => scrollToLogin("patient")}
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

        {/* Main Hero Content Area — Two-Column Desktop Grid */}
        <main className="relative z-20 flex-1 flex flex-col justify-center px-6 lg:px-12 max-w-7xl mx-auto min-h-0 py-2 w-full">
          
          {/* STATE 1: Hero Content */}
          <div
            ref={heroRef}
            className="w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            style={{
              opacity: 1,
              transform: "translateY(0px) scale(1)",
              pointerEvents: "auto",
              visibility: "visible",
            }}
          >
            {/* LEFT COLUMN: Editorial Hero Copy & Actions */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="text-cyan-400 font-mono text-[11px] tracking-[0.2em] uppercase mb-2.5 font-semibold">
                CLINICAL INTELLIGENCE PLATFORM
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100 leading-[1.08] font-['Manrope']">
                Clinical intelligence, <br />
                <span className="text-cyan-400 font-extrabold">from lab data to care.</span>
              </h1>

              <p className="mt-3.5 text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                Transform complex lab data into structured biomarkers, longitudinal insights, and actionable clinical workflows.
              </p>

              <div className="flex flex-row items-center justify-start gap-3.5 my-5 w-full">
                <Button
                  className="h-10 sm:h-11 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070a]"
                  onClick={() => scrollToLogin("patient")}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Patient Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  className="h-10 sm:h-11 px-5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070a]"
                  onClick={() => scrollToLogin("doctor")}
                >
                  <Stethoscope className="h-4 w-4" />
                  <span>Doctor Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Clinical Trust Badge Row */}
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

              {/* Feature Capability Strip */}
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

            {/* RIGHT COLUMN: Dedicated 3D Stage Space Placeholder */}
            <div className="hidden lg:block lg:col-span-5 h-[480px] pointer-events-none relative" />
          </div>

          {/* STATE 2: Revealed Embedded Glassmorphic Login Card */}
          <div
            ref={loginRef}
            className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none"
            style={{
              opacity: prefersReducedMotion ? 1 : 0,
              transform: prefersReducedMotion ? "translateY(0px) scale(1)" : "translateY(35px) scale(0.92)",
              pointerEvents: prefersReducedMotion ? "auto" : "none",
              visibility: prefersReducedMotion ? "visible" : "hidden",
            }}
          >
            <GlassmorphicLoginCard initialTab={cardTab} key={cardTab} />
          </div>
        </main>

        {/* Scroll Indicator Prompt & Footer */}
        <footer className="relative z-30 border-t border-slate-800/40 bg-[#06070a]/80 backdrop-blur-md py-2.5 px-6 text-center text-[11px] text-[#64748b] font-mono shrink-0 flex items-center justify-between">
          <div>© 2026 Zebra Synapse Health. Enterprise Clinical Infrastructure.</div>

          {!prefersReducedMotion && (
            <>
              <div
                ref={prompt1Ref}
                className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase tracking-wider transition-opacity duration-300"
                style={{ opacity: 1 }}
              >
                <span className="hidden sm:inline">SCROLL TO EXPLORE</span>
                <ChevronDown className="h-3.5 w-3.5 animate-bounce text-cyan-400" />
              </div>

              <div
                ref={prompt2Ref}
                className="flex items-center gap-1.5 text-cyan-300 font-mono text-[10px] uppercase tracking-wider transition-opacity duration-300"
                style={{ opacity: 0 }}
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
