import React from 'react';

interface BohoMarkProps {
  className?: string;
  animated?: boolean;
  title?: string;
}

export function BohoMark({
  className = 'w-20 h-20',
  animated = false,
  title = 'Boho Mentosluk',
}: BohoMarkProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bohoCore" x1="24" y1="18" x2="104" y2="110">
          <stop offset="0%" stopColor="#F0B49F" />
          <stop offset="48%" stopColor="#C17767" />
          <stop offset="100%" stopColor="#6E3B35" />
        </linearGradient>

        <linearGradient id="bohoInk" x1="32" y1="34" x2="98" y2="100">
          <stop offset="0%" stopColor="#F8E7D9" />
          <stop offset="100%" stopColor="#C17767" />
        </linearGradient>

        <filter id="bohoGlow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0.75 0 0 0 0.76  0 0.42 0 0 0.47  0 0 0.32 0 0.40  0 0 0 1 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#bohoGlow)">
        <circle
          cx="64"
          cy="64"
          r="46"
          stroke="url(#bohoCore)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="156 48"
          className={animated ? 'origin-center animate-spin' : ''}
          style={animated ? { animationDuration: '7s' } : undefined}
          opacity="0.9"
        />

        <circle
          cx="64"
          cy="64"
          r="34"
          stroke="#C17767"
          strokeWidth="1.5"
          strokeDasharray="4 9"
          opacity="0.32"
        />

        <path
          d="M33 43C45 40 55 43 64 52C73 43 83 40 95 43V88C83 85 73 88 64 97C55 88 45 85 33 88V43Z"
          fill="#111114"
          stroke="url(#bohoCore)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        <path
          d="M64 52V97"
          stroke="#C17767"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <path
          d="M42 54C49 53 55 55 59 60M42 66C49 65 55 67 59 72M86 54C79 53 73 55 69 60M86 66C79 65 73 67 69 72"
          stroke="url(#bohoInk)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.95"
        />

        <path
          d="M64 25L70 43L64 52L58 43L64 25Z"
          fill="url(#bohoCore)"
          stroke="#F4C8B8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        <circle cx="64" cy="63" r="7" fill="#C17767" opacity="0.16" />
        <circle cx="64" cy="63" r="3.5" fill="#E2A08E" />
      </g>
    </svg>
  );
}
