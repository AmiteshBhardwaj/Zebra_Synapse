interface DnaHelixProps {
  className?: string;
}

export default function DnaHelix({ className = "" }: DnaHelixProps) {
  return (
    <div className={`relative pointer-events-none select-none flex items-center justify-center ${className}`}>
      {/* Restrained Cyan Ambient Light Aura */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.16)_0%,rgba(99,102,241,0.04)_50%,transparent_75%)] blur-2xl rounded-full scale-105 pointer-events-none" />

      {/* Cropped 5.0:1 Tall Slender PNG DNA Asset */}
      <img
        src="/assets/dna-helix.png"
        alt="Zebra Synapse DNA Helix"
        className="w-full h-full object-contain filter drop-shadow-[0_0_14px_rgba(6,182,212,0.30)] opacity-80 sm:opacity-90 transition-all duration-300 animate-[dnaPulseFloat_10s_ease-in-out_infinite] motion-reduce:animate-none"
      />
    </div>
  );
}
