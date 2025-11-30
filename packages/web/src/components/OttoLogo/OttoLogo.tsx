import React from 'react';
import './OttoLogo.css';

interface OttoLogoProps {
  size?: number;
  className?: string;
}

export const OttoLogo: React.FC<OttoLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      className={`otto-logo ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      fill="none"
    >
      {/* Exclamation point - logo accent */}
      <line 
        x1="50" 
        y1="5" 
        x2="50" 
        y2="18"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle 
        cx="50" 
        cy="23" 
        r="2.2"
        fill="currentColor"
      />

      {/* Lightning bolt 1 - top left */}
      <path
        d="M 12 20 L 17 30 L 14 30 L 20 40 L 15 40 L 9 27 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Lightning bolt 2 - top right */}
      <path
        d="M 88 20 L 83 30 L 86 30 L 80 40 L 85 40 L 91 27 Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Duck head - refined proportions */}
      <path
        d="M 30 50 
           Q 25 35, 35 30 
           Q 50 25, 65 30 
           Q 75 35, 70 50 
           Q 70 60, 60 65 
           Q 50 68, 40 65 
           Q 30 60, 30 50"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Duck bill – flat, two triangles, below eyes */}
      {/* Top bill */}
      <path
        d="M 38 53 L 62 53 L 50 57 Z"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Bottom bill */}
      <path
        d="M 40 57 L 60 57 L 50 60 Z"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Eyes - refined proportions */}
      {/* Left eye */}
      <circle
        cx="42"
        cy="42"
        r="6"
        strokeWidth="2.5"
      />
      <circle
        cx="42"
        cy="42"
        r="3.5"
        fill="currentColor"
      />

      {/* Right eye */}
      <circle
        cx="58"
        cy="42"
        r="6"
        strokeWidth="2.5"
      />
      <circle
        cx="58"
        cy="42"
        r="3.5"
        fill="currentColor"
      />

      {/* Duck body - refined for logo balance */}
      <path
        d="M 28 70
           Q 20 85, 35 95
           Q 50 105, 65 95
           Q 80 85, 72 70
           Q 50 78, 28 70"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

