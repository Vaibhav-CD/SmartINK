import React from 'react';

export const GalvanicCornerCircuits: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Top-Left Corner Galvanic Circuit Frame */}
      <div className="fixed top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 opacity-90 transition-opacity">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="circuitGlowTL" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <g filter="url(#circuitGlowTL)" stroke="#a3e635" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {/* Outer Corner Heavy Cyber Frame */}
            <path d="M 16 90 L 16 16 L 90 16" stroke="#22c55e" strokeWidth="3" opacity="0.85" />
            <path d="M 28 28 L 60 28 L 74 48 L 74 95" strokeWidth="3.2" />
            <path d="M 28 54 L 46 54 L 56 72 L 56 120" strokeWidth="2.8" />
            <path d="M 88 32 L 108 52 L 108 85" strokeWidth="2.5" />
            <path d="M 120 24 L 134 42 L 134 68" strokeWidth="2.5" />

            {/* Glowing Runes & Vertical Pulse Bars */}
            <line x1="36" y1="130" x2="36" y2="160" strokeWidth="4.5" stroke="#86efac" />
            <line x1="48" y1="140" x2="48" y2="180" strokeWidth="4.5" stroke="#4ade80" />
            <circle cx="74" cy="100" r="3.5" fill="#a3e635" />
            <circle cx="56" cy="125" r="3" fill="#a3e635" />
            <circle cx="108" cy="90" r="3" fill="#a3e635" />
          </g>
        </svg>
      </div>

      {/* Top-Right Corner Galvanic Circuit Frame */}
      <div className="fixed top-0 right-0 w-64 h-64 sm:w-80 sm:h-80 opacity-90 scale-x-[-1] transition-opacity">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="circuitGlowTR" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <g filter="url(#circuitGlowTR)" stroke="#a3e635" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 16 90 L 16 16 L 90 16" stroke="#22c55e" strokeWidth="3" opacity="0.85" />
            <path d="M 28 28 L 60 28 L 74 48 L 74 95" strokeWidth="3.2" />
            <path d="M 28 54 L 46 54 L 56 72 L 56 120" strokeWidth="2.8" />
            <path d="M 88 32 L 108 52 L 108 85" strokeWidth="2.5" />
            <path d="M 120 24 L 134 42 L 134 68" strokeWidth="2.5" />
            <line x1="36" y1="130" x2="36" y2="160" strokeWidth="4.5" stroke="#86efac" />
            <line x1="48" y1="140" x2="48" y2="180" strokeWidth="4.5" stroke="#4ade80" />
            <circle cx="74" cy="100" r="3.5" fill="#a3e635" />
            <circle cx="56" cy="125" r="3" fill="#a3e635" />
          </g>
        </svg>
      </div>

      {/* Bottom-Left Corner Galvanic Circuit Frame */}
      <div className="fixed bottom-0 left-0 w-64 h-64 sm:w-80 sm:h-80 opacity-90 scale-y-[-1] transition-opacity">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="circuitGlowBL" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <g filter="url(#circuitGlowBL)" stroke="#a3e635" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 16 90 L 16 16 L 90 16" stroke="#22c55e" strokeWidth="3" opacity="0.85" />
            <path d="M 28 28 L 60 28 L 74 48 L 74 95" strokeWidth="3.2" />
            <path d="M 28 54 L 46 54 L 56 72 L 56 120" strokeWidth="2.8" />
            <path d="M 88 32 L 108 52 L 108 85" strokeWidth="2.5" />
            <path d="M 120 24 L 134 42 L 134 68" strokeWidth="2.5" />
            <line x1="36" y1="130" x2="36" y2="160" strokeWidth="4.5" stroke="#86efac" />
            <line x1="48" y1="140" x2="48" y2="180" strokeWidth="4.5" stroke="#4ade80" />
            <circle cx="74" cy="100" r="3.5" fill="#a3e635" />
          </g>
        </svg>
      </div>

      {/* Bottom-Right Corner Galvanic Circuit Frame */}
      <div className="fixed bottom-0 right-0 w-64 h-64 sm:w-80 sm:h-80 opacity-90 scale-x-[-1] scale-y-[-1] transition-opacity">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="circuitGlowBR" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <g filter="url(#circuitGlowBR)" stroke="#a3e635" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 16 90 L 16 16 L 90 16" stroke="#22c55e" strokeWidth="3" opacity="0.85" />
            <path d="M 28 28 L 60 28 L 74 48 L 74 95" strokeWidth="3.2" />
            <path d="M 28 54 L 46 54 L 56 72 L 56 120" strokeWidth="2.8" />
            <path d="M 88 32 L 108 52 L 108 85" strokeWidth="2.5" />
            <path d="M 120 24 L 134 42 L 134 68" strokeWidth="2.5" />
            <line x1="36" y1="130" x2="36" y2="160" strokeWidth="4.5" stroke="#86efac" />
            <line x1="48" y1="140" x2="48" y2="180" strokeWidth="4.5" stroke="#4ade80" />
            <circle cx="74" cy="100" r="3.5" fill="#a3e635" />
          </g>
        </svg>
      </div>
    </div>
  );
};
