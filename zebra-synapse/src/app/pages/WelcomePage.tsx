import { useNavigate } from "react-router";
import { Stethoscope, User } from "lucide-react";
import { Button } from "../components/ui/button";

const portalCards = [
  {
    title: "Patient Portal",
    description:
      "Access lab intelligence, care timelines, and AI-guided health summaries from one secure interface.",
    icon: User,
    accent: "#6C5BD4",
    glow: "shadow-[0_18px_50px_rgba(108,91,212,0.35)]",
    primaryLabel: "Login",
    secondaryLabel: "Sign Up",
    onPrimary: "/login/patient",
    onSecondary: "/signup/patient",
  },
  {
    title: "Doctor Portal",
    description:
      "Review patients, monitor structured biomarker trends, and make faster care decisions with AI support.",
    icon: Stethoscope,
    accent: "#FF6000",
    glow: "shadow-[0_18px_50px_rgba(255,96,0,0.35)]",
    primaryLabel: "Login",
    secondaryLabel: "Sign Up",
    onPrimary: "/login/doctor",
    onSecondary: "/signup/doctor",
  },
] as const;

function DnaHelix() {
  const rungPositions = [8, 18, 28, 38, 48, 58, 68, 78, 88];

  return (
    <div className="relative flex h-[520px] w-full items-center justify-center md:h-[620px]">
      <div className="absolute inset-x-[14%] top-[12%] z-0 h-44 rounded-full bg-[radial-gradient(circle,_rgba(108,91,212,0.45)_0%,_rgba(108,91,212,0)_72%)] blur-3xl" />
      <div className="absolute inset-x-[18%] bottom-[10%] z-0 h-40 rounded-full bg-[radial-gradient(circle,_rgba(255,96,0,0.36)_0%,_rgba(255,96,0,0)_72%)] blur-3xl" />

      <div className="relative z-10 h-full w-full max-w-[420px] animate-[float_9s_ease-in-out_infinite]">
        <svg
          viewBox="0 0 320 640"
          className="absolute inset-0 h-full w-full drop-shadow-[0_0_34px_rgba(108,91,212,0.45)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="dna-left" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF6000" />
              <stop offset="48%" stopColor="#FFD1B2" />
              <stop offset="100%" stopColor="#6C5BD4" />
            </linearGradient>
            <linearGradient id="dna-right" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6C5BD4" />
              <stop offset="52%" stopColor="#E0D9FF" />
              <stop offset="100%" stopColor="#FF6000" />
            </linearGradient>
            <filter id="dna-glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M92 24 C 214 102, 214 166, 92 242 S -30 386, 92 466 S 214 598, 92 618"
            stroke="url(#dna-left)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            filter="url(#dna-glow)"
          />
          <path
            d="M228 24 C 106 102, 106 166, 228 242 S 350 386, 228 466 S 106 598, 228 618"
            stroke="url(#dna-right)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            filter="url(#dna-glow)"
          />

          {rungPositions.map((y) => {
            const actualY = y * 6.3;
            const direction = y % 2 === 0 ? 1 : -1;
            const leftX = direction > 0 ? 112 : 144;
            const rightX = direction > 0 ? 208 : 176;
            const opacity = direction > 0 ? 0.9 : 0.55;

            return (
              <g key={y} opacity={opacity}>
                <line
                  x1={leftX}
                  y1={actualY}
                  x2={rightX}
                  y2={actualY + 18}
                  stroke="rgba(255,255,255,0.72)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx={leftX} cy={actualY} r="6" fill="#FF6000" />
                <circle cx={rightX} cy={actualY + 18} r="6" fill="#6C5BD4" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#242424] text-white">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-18px) rotate(2deg); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(108,91,212,0.24),transparent_30%),radial-gradient(circle_at_82%_28%,rgba(255,96,0,0.2),transparent_28%),linear-gradient(145deg,#0f0f11_0%,#19191d_48%,#242424_100%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.85)_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
        <div className="absolute left-[-8%] top-[6%] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(108,91,212,0.34)_0%,_rgba(108,91,212,0)_70%)] blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-6%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(255,96,0,0.28)_0%,_rgba(255,96,0,0)_72%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 md:px-8 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
        <section className="flex-1">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/55">
              <span className="h-2 w-2 rounded-full bg-[#6C5BD4] shadow-[0_0_18px_#6C5BD4]" />
              AI Biotech Platform
            </div>

            <h1 className="mt-8 font-['Sora'] text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl xl:text-7xl">
              <span className="bg-[linear-gradient(135deg,#ffffff_0%,#d9d4ff_42%,#ffb788_100%)] bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(108,91,212,0.2)]">
                Zebra Synapse
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/64 sm:text-xl">
              AI-Powered Healthcare Management Platform
            </p>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/48 sm:text-base">
              Built for next-generation care teams and patients who need structured health data,
              faster decision support, and a premium digital healthcare experience.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {portalCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="group relative flex min-h-[390px] flex-col rounded-[28px] border border-white/10 bg-white/[0.05] p-7 backdrop-blur-xl transition duration-500 animate-in fade-in slide-in-from-bottom-4 hover:scale-[1.03] hover:border-white/20"
                    style={{ animationDuration: index === 0 ? "700ms" : "950ms" }}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 rounded-[28px] opacity-0 blur-2xl transition duration-500 group-hover:opacity-100 ${
                        card.accent === "#6C5BD4"
                          ? "bg-[radial-gradient(circle_at_top,rgba(108,91,212,0.28),transparent_60%)]"
                          : "bg-[radial-gradient(circle_at_top,rgba(255,96,0,0.24),transparent_60%)]"
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    <div className="relative z-10 flex h-full flex-col">
                      <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-black/25">
                        <Icon
                          className={`h-7 w-7 ${card.glow}`}
                          strokeWidth={1.7}
                          style={{ color: card.accent }}
                        />
                      </div>

                      <div className="flex-grow">
                        <h2 className="font-['Sora'] text-3xl font-semibold tracking-[-0.03em] text-white">
                          {card.title}
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-white/56">
                          {card.description}
                        </p>
                      </div>

                      <div className="mt-10 space-y-3">
                        <Button
                          className="h-12 w-full rounded-2xl border-0 bg-[linear-gradient(135deg,#6C5BD4_0%,#FF6000_100%)] text-white shadow-[0_18px_40px_rgba(108,91,212,0.22)] transition duration-300 hover:brightness-110"
                          onClick={() => navigate(card.onPrimary)}
                        >
                          {card.primaryLabel}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12 w-full rounded-2xl border-white/12 bg-black/20 text-white/80 transition duration-300 hover:bg-white/[0.06] hover:text-white"
                          onClick={() => navigate(card.onSecondary)}
                        >
                          {card.secondaryLabel}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-12 flex flex-1 items-center justify-center lg:mt-0">
          <div className="relative w-full max-w-[540px]">
            <div className="absolute inset-x-[16%] top-[14%] h-20 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.18),transparent_72%)] blur-2xl" />
            <div className="absolute bottom-[12%] left-[20%] h-24 w-24 rounded-full bg-[#6C5BD4]/25 blur-3xl" />
            <div className="absolute right-[18%] top-[22%] h-24 w-24 rounded-full bg-[#FF6000]/20 blur-3xl" />
            <DnaHelix />
          </div>
        </section>
      </div>
    </div>
  );
}
