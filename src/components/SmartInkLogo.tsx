import React from 'react';

interface SmartInkLogoProps {
  size?: number;
  className?: string;
}

export const SmartInkLogo: React.FC<SmartInkLogoProps> = ({ size = 28, className = '' }) => {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-sm ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="smartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Outer Minimalist Precision Ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#smartGrad)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Diagonal Cross-Focal Hourglass / Aperture Blades */}
        <path
          d="M26 26 L50 50 L26 74"
          stroke="url(#smartGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M74 26 L50 50 L74 74"
          stroke="url(#smartGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Luminous Core Dial */}
        <circle cx="50" cy="50" r="10" fill="url(#coreGlow)" />
        <circle cx="50" cy="50" r="5" fill="#ffffff" />
      </svg>
    </div>
  );
};


