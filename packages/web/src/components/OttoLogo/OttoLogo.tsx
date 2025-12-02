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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Main head shape - angular hexagon similar to MagicWandIcon but more elaborate */}
      <polygon 
        points="4,8 8,4 16,4 20,8 20,14 16,18 8,18 4,14" 
        fill="none"
      />

      {/* Elaborate antenna with star - more detailed than MagicWandIcon */}
      <line x1="7" y1="4" x2="7" y2="1" />
      <line x1="17" y1="4" x2="17" y2="1" />
      
      {/* Glowing star between antennas - more elaborate */}
      <g>
        <polygon 
          points="12,0.5 12.5,1.8 13.8,1.8 12.8,2.8 13.3,4.1 12,3.3 10.7,4.1 11.2,2.8 10.2,1.8 11.5,1.8" 
          fill="currentColor"
        />
        <circle cx="12" cy="2.3" r="1.5" fill="currentColor" opacity="0.2" />
        <circle cx="12" cy="2.3" r="2.2" fill="currentColor" opacity="0.1" />
      </g>

      {/* Eyes - angular triangles pointing down (matching MagicWandIcon style but larger) */}
      <polygon 
        points="8,9 8,13 9.5,13" 
        fill="none"
      />
      <polygon 
        points="16,9 14.5,13 16,13" 
        fill="none"
      />
      
      {/* Eye highlights - small filled circles */}
      <circle cx="8.5" cy="10.5" r="0.8" fill="currentColor" />
      <circle cx="15.5" cy="10.5" r="0.8" fill="currentColor" />

      {/* Mouth - angular beak shape (more elaborate than straight line) */}
      <polygon 
        points="9,15 12,17 15,15 15,16 12,18 9,16" 
        fill="none"
      />
      <line x1="9" y1="15" x2="15" y2="15" />

      {/* Body - angular geometric shape extending downward */}
      <polygon 
        points="6,18 8,18 10,22 14,22 16,18 18,18 18,20 16,20 14,22 10,22 8,20 6,20" 
        fill="none"
      />

      {/* Decorative elements - angular accents on sides (like lightning but geometric) */}
      <polygon 
        points="2,10 4,8 3,12 2,12" 
        fill="none"
      />
      <polygon 
        points="22,10 20,8 21,12 22,12" 
        fill="none"
      />

      {/* Additional geometric details - small angular shapes for elaboration */}
      <line x1="5" y1="6" x2="5" y2="8" />
      <line x1="19" y1="6" x2="19" y2="8" />
      <line x1="6" y1="16" x2="6" y2="18" />
      <line x1="18" y1="16" x2="18" y2="18" />
    </svg>
  );
};

