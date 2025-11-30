/**
 * SVG Icons for tabs - simple, clear, modern interpretations
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
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

export const MagicWandIcon: React.FC<IconProps> = ({ className, size = 20, style }) => {
  return (
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
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head shape (angular) */}
      <polygon 
        points="6,5 18,5 20,10 18,19 6,19 4,10" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      />

      {/* Eyes (large downward-pointing outlined triangles) */}
      <polygon 
        points="8,9 8,13 9,13" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      />
      <polygon 
        points="16,9 15,13 16,13" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      />

      {/* Mouth (solid straight line) */}
      <line 
        x1="8" 
        y1="17" 
        x2="16" 
        y2="17" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />

      {/* Antennas */}
      <line 
        x1="7" 
        y1="5" 
        x2="7" 
        y2="2" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <line 
        x1="17" 
        y1="5" 
        x2="17" 
        y2="2" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />

      {/* Glowing Star between antennas */}
      <g>
        <polygon 
          points="12,1 12.4,2.2 13.4,2.2 12.6,3 13,4.2 12,3.4 11,4.2 11.4,3 10.6,2.2 11.6,2.2" 
          fill="currentColor"
        />
        <circle 
          cx="12" 
          cy="2.6" 
          r="1.2" 
          fill="currentColor" 
          opacity="0.15"
        />
        <circle 
          cx="12" 
          cy="2.6" 
          r="1.8" 
          fill="currentColor" 
          opacity="0.08"
        />
      </g>
    </svg>
  );
};

