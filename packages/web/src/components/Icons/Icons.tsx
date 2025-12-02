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

export const HelpIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
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
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
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

export const SettingsIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
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
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6m-9-9h6m6 0h6m-1.93-6.07l-4.24 4.24m0 5.66l4.24 4.24m-12.73 0l4.24-4.24m0-5.66l-4.24-4.24" />
  </svg>
);

export const ApiKeysIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
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
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

export const McpServerIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
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
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const SyncIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
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
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const AiPromptIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
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
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17 2 12 7 7 2" />
  </svg>
);

export const AppearanceIcon: React.FC<IconProps> = ({ className, size = 20 }) => (
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
    <circle cx="13.5" cy="6.5" r=".5" />
    <circle cx="17.5" cy="10.5" r=".5" />
    <circle cx="8.5" cy="7.5" r=".5" />
    <circle cx="6.5" cy="12.5" r=".5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

