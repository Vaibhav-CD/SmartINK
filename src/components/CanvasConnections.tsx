import React from 'react';
import type { TheoremItem, ProofNode } from '../types';

interface CanvasConnectionsProps {
  theorems: TheoremItem[];
  proofs: ProofNode[];
}

export const CanvasConnections: React.FC<CanvasConnectionsProps> = ({
  theorems,
  proofs,
}) => {
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0">
      <defs>
        <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
        </linearGradient>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 8 4, 0 8" fill="#818cf8" />
        </marker>
      </defs>

      {proofs.map((proof) => {
        const parentTheorem = theorems.find((t) => t.id === proof.theoremId);
        if (!parentTheorem) return null;

        // Source center-right of theorem
        const sx = parentTheorem.position.x + parentTheorem.size.width;
        const sy = parentTheorem.position.y + parentTheorem.size.height / 2;

        // Target center-left of proof
        const tx = proof.position.x;
        const ty = proof.position.y + 120; // approximate center

        const dx = Math.abs(tx - sx);
        const c1x = sx + Math.max(dx * 0.5, 60);
        const c1y = sy;
        const c2x = tx - Math.max(dx * 0.5, 60);
        const c2y = ty;

        const pathData = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;

        return (
          <g key={`conn-${proof.id}`}>
            {/* Glow backing path */}
            <path
              d={pathData}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="4"
              strokeOpacity="0.15"
            />
            {/* Main connecting bezier path */}
            <path
              d={pathData}
              fill="none"
              stroke="url(#branchGradient)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              markerEnd="url(#arrowhead)"
              className="animate-pulse"
            />
          </g>
        );
      })}
    </svg>
  );
};
