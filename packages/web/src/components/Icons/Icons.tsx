/**
 * SVG Icons for tabs - simple, clear, modern interpretations
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const ChatIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const ScriptsIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <text 
      x="12" 
      y="16" 
      fontSize="11" 
      fill="currentColor" 
      fontFamily="monospace" 
      textAnchor="middle" 
      fontWeight="bold"
      style={{ userSelect: 'none' }}
    >
      &lt;&gt;
    </text>
  </svg>
);

export const NotesIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const MagicWandIcon: React.FC<IconProps> = ({ className, size = 20 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head shape (angular) */}
      <polygon 
        points="50,40 150,40 170,80 150,160 50,160 30,80" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="4"
      />

      {/* Eyes (large downward-pointing outlined triangles) */}
      <polygon 
        points="70,75 65,105 75,105" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <polygon 
        points="130,75 125,105 135,105" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="4"
      />

      {/* Mouth (solid straight line) */}
      <line 
        x1="70" 
        y1="140" 
        x2="130" 
        y2="140" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round"
      />

      {/* Antennas */}
      <line 
        x1="60" 
        y1="40" 
        x2="60" 
        y2="20" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <line 
        x1="140" 
        y1="40" 
        x2="140" 
        y2="20" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round"
      />

      {/* Glowing Star between antennas */}
      <g>
        <polygon 
          points="100,10 103,18 112,18 105,24 108,32 100,28 92,32 95,24 88,18 97,18" 
          fill="currentColor"
        />
        <circle 
          cx="100" 
          cy="22" 
          r="10" 
          fill="currentColor" 
          opacity="0.15"
        />
        <circle 
          cx="100" 
          cy="22" 
          r="15" 
          fill="currentColor" 
          opacity="0.08"
        />
      </g>
    </svg>
  );
};

