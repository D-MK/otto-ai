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
      viewBox="0 0 24 24"
      className={`otto-logo ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Head */}
      <path d="M6 9.5c0-3.59 2.69-6.5 6-6.5s6 2.91 6 6.5v4c0 3.59-2.69 6.5-6 6.5s-6-2.91-6-6.5v-4z" />

      {/* Antennas */}
      <line x1="9" y1="4.25" x2="9" y2="2.2" />
      <line x1="15" y1="4.25" x2="15" y2="2.2" />
      <circle cx="12" cy="1.6" r="0.9" fill="currentColor" stroke="none" />

      {/* Eyes */}
      <circle cx="9.25" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.75" cy="11" r="0.9" fill="currentColor" stroke="none" />

      {/* Eye outlines */}
      <path d="M8 10.2c0.75-0.9 1.75-0.9 2.5 0" />
      <path d="M16 10.2c-0.75-0.9-1.75-0.9-2.5 0" />

      {/* Mouth */}
      <path d="M9.4 15.2h5.2" />

      {/* Collar / base */}
      <path d="M7.6 18.5l-1 2.5h10.8l-1-2.5" />
      <path d="M9.25 18.5l2.75 2 2.75-2" />
    </svg>
  );
};

