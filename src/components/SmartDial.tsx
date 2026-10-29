import React from 'react';

interface SmartDialProps {
  size?: number;
  onClick?: () => void;
  className?: string;
}

export const SmartDial: React.FC<SmartDialProps> = ({
  size = 150,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative flex items-center justify-center shrink-0 cursor-pointer group transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
      title="SmartInk Luminous Energy Core"
    >
      {/* 1. Ambient Radiating Green Energy Halo / Glow */}
      <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-lime-400/25 via-emerald-500/35 to-green-400/20 blur-3xl group-hover:blur-4xl group-hover:from-lime-400/50 group-hover:via-emerald-400/45 transition-all animate-pulse pointer-events-none" />

      {/* 2. Concentric Shockwave Rings */}
      <div
        className="absolute -inset-6 rounded-full border border-lime-400/30 animate-ping pointer-events-none"
        style={{ animationDuration: '4s' }}
      />
      <div
        className="absolute -inset-3 rounded-full border border-dashed border-emerald-400/40 animate-spin pointer-events-none"
        style={{ animationDuration: '28s' }}
      />

      {/* 3. Radiating Optical Conduits and Rays */}
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none"
      >
        <g stroke="#a3e635" strokeWidth="1.5" opacity="0.6" strokeLinecap="round">
          {/* Cardinal Rays */}
          <line x1="120" y1="20" x2="120" y2="45" strokeWidth="2.5" />
          <line x1="120" y1="195" x2="120" y2="220" strokeWidth="2.5" />
          <line x1="20" y1="120" x2="45" y2="120" strokeWidth="2.5" />
          <line x1="195" y1="120" x2="220" y2="120" strokeWidth="2.5" />

          {/* Diagonal Guides */}
          <line x1="49" y1="49" x2="68" y2="68" strokeDasharray="3 3" />
          <line x1="191" y1="49" x2="172" y2="68" strokeDasharray="3 3" />
          <line x1="49" y1="191" x2="68" y2="172" strokeDasharray="3 3" />
          <line x1="191" y1="191" x2="172" y2="172" strokeDasharray="3 3" />

          {/* Energy Terminal Nodes */}
          <circle cx="120" cy="18" r="2.5" fill="#a3e635" />
          <circle cx="120" cy="222" r="2.5" fill="#a3e635" />
          <circle cx="18" cy="120" r="2.5" fill="#a3e635" />
          <circle cx="222" cy="120" r="2.5" fill="#a3e635" />
        </g>
      </svg>

      {/* 4. Pure Luminous Green Light Core Lens */}
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_30px_rgba(163,230,53,0.85)] group-hover:drop-shadow-[0_0_45px_rgba(163,230,53,1)] transition-all"
      >
        <defs>
          {/* Precision Outer Chassis */}
          <radialGradient id="chassisOuter" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#090d14" />
          </radialGradient>

          {/* Deep Radiant Green Light Source */}
          <radialGradient id="pureGreenLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="18%" stopColor="#eefdc8" />
            <stop offset="38%" stopColor="#a3e635" />
            <stop offset="65%" stopColor="#22c55e" />
            <stop offset="88%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#052e16" />
          </radialGradient>

          {/* Secondary Pulse Glow */}
          <radialGradient id="innerFlare" cx="45%" cy="40%" r="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#bef264" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>

          <filter id="intenseLightGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur1" />
            <feGaussianBlur stdDeviation="10" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Heavy Outer Gunmetal Bezel */}
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="url(#chassisOuter)"
          stroke="#475569"
          strokeWidth="2.5"
        />

        {/* 2. Rotating Precision Tech Segment Ring */}
        <circle
          cx="100"
          cy="100"
          r="86"
          stroke="#84cc16"
          strokeWidth="2"
          strokeDasharray="4 6 14 5 20 4"
          className="origin-center animate-spin opacity-80"
          style={{ animationDuration: '24s' }}
        />

        {/* 3. Beveled Inner Retaining Ring */}
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="#090d14"
          stroke="#1e293b"
          strokeWidth="3.5"
        />

        {/* 4. Pure Luminous Green Source of Light (Clean Radiant Core) */}
        <circle
          cx="100"
          cy="100"
          r="72"
          fill="url(#pureGreenLight)"
          filter="url(#intenseLightGlow)"
        />

        {/* 5. Spherical Specular Light Bloom Reflection */}
        <ellipse
          cx="90"
          cy="82"
          rx="52"
          ry="38"
          fill="url(#innerFlare)"
          className="animate-pulse"
          style={{ animationDuration: '3s' }}
        />

        {/* 6. Concentric Optical Aperture Ring (Subtle Translucent Guide) */}
        <circle
          cx="100"
          cy="100"
          r="48"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeDasharray="4 8"
          opacity="0.35"
        />

        {/* 7. Bright Center Quantum Light Node */}
        <circle cx="100" cy="100" r="14" fill="#ffffff" opacity="0.9" filter="drop-shadow(0 0 8px #ffffff)" />
        <circle cx="100" cy="100" r="7" fill="#f7fee7" />

        {/* 8. Top Glass Arc Lens Reflection */}
        <path
          d="M 54 48 A 66 66 0 0 1 146 48"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.65"
        />
      </svg>
    </div>
  );
};

export default SmartDial;
