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
      title="SmartInk Core Matrix (Click to charge)"
    >
      {/* 1. Empowering Radiating Energy Halo / Shockwaves */}
      <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-lime-400/20 via-emerald-500/25 to-green-500/10 blur-3xl group-hover:blur-4xl group-hover:from-lime-400/40 transition-all animate-pulse pointer-events-none" />

      {/* 2. Concentric Galvanic Shockwave Rings */}
      <div className="absolute -inset-6 rounded-full border border-lime-400/20 animate-ping pointer-events-none" style={{ animationDuration: '4s' }} />
      <div className="absolute -inset-3 rounded-full border border-dashed border-emerald-500/30 animate-spin pointer-events-none" style={{ animationDuration: '30s' }} />

      {/* 3. Empowering Radiating Conduit Lines (Spikes radiating outward) */}
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none"
      >
        <g stroke="#a3e635" strokeWidth="1.5" opacity="0.6" strokeLinecap="round">
          {/* Top/Bottom/Left/Right Ray Conduits */}
          <line x1="120" y1="20" x2="120" y2="45" strokeWidth="2.5" />
          <line x1="120" y1="195" x2="120" y2="220" strokeWidth="2.5" />
          <line x1="20" y1="120" x2="45" y2="120" strokeWidth="2.5" />
          <line x1="195" y1="120" x2="220" y2="120" strokeWidth="2.5" />

          {/* Diagonal Energy Spikes */}
          <line x1="49" y1="49" x2="68" y2="68" strokeDasharray="3 3" />
          <line x1="191" y1="49" x2="172" y2="68" strokeDasharray="3 3" />
          <line x1="49" y1="191" x2="68" y2="172" strokeDasharray="3 3" />
          <line x1="191" y1="191" x2="172" y2="172" strokeDasharray="3 3" />

          {/* Accent Circuit Dots on Ray Ends */}
          <circle cx="120" cy="18" r="2.5" fill="#a3e635" />
          <circle cx="120" cy="222" r="2.5" fill="#a3e635" />
          <circle cx="18" cy="120" r="2.5" fill="#a3e635" />
          <circle cx="222" cy="120" r="2.5" fill="#a3e635" />
        </g>
      </svg>

      {/* 4. The Canonical SmartInk Emblem (from User Reference Image 2) */}
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-[0_0_24px_rgba(163,230,53,0.7)] group-hover:drop-shadow-[0_0_36px_rgba(163,230,53,0.95)] transition-all"
      >
        <defs>
          {/* Heavy Metallic Outer Bezel */}
          <radialGradient id="bezelOuter" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0a0f16" />
          </radialGradient>

          {/* Vivid Alien Lime-Green (Exact Canonical Color from Image 2) */}
          <radialGradient id="canonicalLime" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="45%" stopColor="#a3e635" />
            <stop offset="85%" stopColor="#65a30d" />
            <stop offset="100%" stopColor="#4d7c0f" />
          </radialGradient>

          <filter id="empowerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Heavy Outer Gunmetal Chassis Ring */}
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="url(#bezelOuter)"
          stroke="#64748b"
          strokeWidth="3"
        />

        {/* 2. Rotating Galvanic Alien Glyphs Track (Image 1 Runes) */}
        <circle
          cx="100"
          cy="100"
          r="86"
          stroke="#84cc16"
          strokeWidth="2.5"
          strokeDasharray="4 6 14 5 20 4"
          className="origin-center animate-spin opacity-85"
          style={{ animationDuration: '22s' }}
        />

        {/* 3. Inner Beveled Rim */}
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="#0a0d14"
          stroke="#1e293b"
          strokeWidth="4"
        />

        {/* 4. THE CANONICAL SmartInk SYMBOL (Image 2) */}
        {/* Full Lime Green Disc */}
        <circle
          cx="100"
          cy="100"
          r="72"
          fill="url(#canonicalLime)"
          filter="url(#empowerGlow)"
        />

        {/* Left Solid Black Wedge Sector pointing to center */}
        <polygon
          points="28,28 100,100 28,172"
          fill="#05070a"
          stroke="#000000"
          strokeWidth="2"
        />

        {/* Right Solid Black Wedge Sector pointing to center */}
        <polygon
          points="172,28 100,100 172,172"
          fill="#05070a"
          stroke="#000000"
          strokeWidth="2"
        />

        {/* Outer Heavy Black Circular Border Rim */}
        <circle
          cx="100"
          cy="100"
          r="72"
          fill="none"
          stroke="#05070a"
          strokeWidth="8"
        />

        {/* Inner Subtle Empowering Highlight Arc */}
        <path
          d="M 52 46 A 66 66 0 0 1 148 46"
          stroke="#f7fee7"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </div>
  );
};

