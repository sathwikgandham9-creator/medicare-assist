import React from 'react';
import { PillShape, PillColor } from '../types';

interface PillIllustrationProps {
  shape: PillShape;
  color: PillColor;
  color2?: PillColor;
  imageUrl?: string;
  size?: number | string;
  className?: string;
  showShadow?: boolean;
}

export const COLOR_MAP: Record<PillColor, { fill: string; stroke: string; highlight: string }> = {
  white: { fill: '#f8fafc', stroke: '#cbd5e1', highlight: '#ffffff' },
  yellow: { fill: '#fef08a', stroke: '#eab308', highlight: '#fef9c3' },
  pink: { fill: '#fbcfe8', stroke: '#ec4899', highlight: '#fdf2f8' },
  blue: { fill: '#93c5fd', stroke: '#3b82f6', highlight: '#dbeafe' },
  green: { fill: '#86efac', stroke: '#22c55e', highlight: '#dcfce7' },
  orange: { fill: '#fdba74', stroke: '#f97316', highlight: '#ffedd5' },
  red: { fill: '#fca5a5', stroke: '#ef4444', highlight: '#fee2e2' },
  brown: { fill: '#d7ba89', stroke: '#854d0e', highlight: '#f5ebe0' },
  black: { fill: '#475569', stroke: '#1e293b', highlight: '#64748b' },
  purple: { fill: '#d8b4fe', stroke: '#a855f7', highlight: '#f3e8ff' },
};

export const SHAPES_LIST: { id: PillShape; label: string; isNonTablet?: boolean }[] = [
  // Tablets
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'two_tone_capsule', label: 'Two-Tone Capsule' },
  { id: 'square', label: 'Square' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'half_moon', label: 'Half-Moon' },
  { id: 'heart', label: 'Heart-Shaped' },
  // Non-tablet forms
  { id: 'syrup', label: 'Syrup Bottle', isNonTablet: true },
  { id: 'injection', label: 'Injection', isNonTablet: true },
  { id: 'inhaler', label: 'Inhaler', isNonTablet: true },
  { id: 'eye_drops', label: 'Eye Drops', isNonTablet: true },
  { id: 'ointment', label: 'Ointment Tube', isNonTablet: true },
  { id: 'powder_sachet', label: 'Powder Sachet', isNonTablet: true },
];

export const COLORS_LIST: { id: PillColor; label: string; hex: string }[] = [
  { id: 'white', label: 'White', hex: '#f8fafc' },
  { id: 'yellow', label: 'Yellow', hex: '#fde047' },
  { id: 'pink', label: 'Pink', hex: '#f472b6' },
  { id: 'blue', label: 'Blue', hex: '#60a5fa' },
  { id: 'green', label: 'Green', hex: '#4ade80' },
  { id: 'orange', label: 'Orange', hex: '#fb923c' },
  { id: 'red', label: 'Red', hex: '#f87171' },
  { id: 'brown', label: 'Brown', hex: '#a16207' },
  { id: 'black', label: 'Charcoal / Black', hex: '#334155' },
  { id: 'purple', label: 'Purple', hex: '#c084fc' },
];

export const PillIllustration: React.FC<PillIllustrationProps> = ({
  shape,
  color,
  color2,
  imageUrl,
  size = 64,
  className = '',
  showShadow = true,
}) => {
  // If actual photo is uploaded, display that with styled border!
  if (imageUrl) {
    return (
      <div
        className={`relative inline-block rounded-2xl overflow-hidden border-2 border-slate-300 shadow-md ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={imageUrl} alt="Medication Photo" className="w-full h-full object-cover" />
      </div>
    );
  }

  const c1 = COLOR_MAP[color] || COLOR_MAP.white;
  const c2 = color2 ? COLOR_MAP[color2] : COLOR_MAP.white;

  const shadowFilter = showShadow ? 'filter drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : '';

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      title={`${color} ${shape}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ filter: shadowFilter ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none' }}
      >
        <defs>
          <linearGradient id={`grad_${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1.highlight} />
            <stop offset="60%" stopColor={c1.fill} />
            <stop offset="100%" stopColor={c1.stroke} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id={`grad_${color2 || 'white'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c2.highlight} />
            <stop offset="60%" stopColor={c2.fill} />
            <stop offset="100%" stopColor={c2.stroke} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* 1. Round */}
        {shape === 'round' && (
          <g transform="translate(10, 10)">
            <circle cx="40" cy="40" r="36" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            {/* Pill score line */}
            <line x1="16" y1="40" x2="64" y2="40" stroke={c1.stroke} strokeWidth="2.5" strokeLinecap="round" />
            {/* Subtle 3D shine */}
            <path d="M 22 28 A 24 24 0 0 1 58 20" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          </g>
        )}

        {/* 2. Oval */}
        {shape === 'oval' && (
          <g transform="translate(10, 15)">
            <ellipse cx="40" cy="35" rx="36" ry="24" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            <line x1="40" y1="18" x2="40" y2="52" stroke={c1.stroke} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 20 25 A 30 18 0 0 1 60 22" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          </g>
        )}

        {/* 3. Capsule */}
        {shape === 'capsule' && (
          <g transform="rotate(-30 50 50) translate(22, 10)">
            <rect x="0" y="0" width="56" height="32" rx="16" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            <line x1="28" y1="2" x2="28" y2="30" stroke={c1.stroke} strokeWidth="2" opacity="0.7" />
            <rect x="6" y="6" width="44" height="6" rx="3" fill="#ffffff" opacity="0.4" />
          </g>
        )}

        {/* 4. Two-Tone Capsule */}
        {shape === 'two_tone_capsule' && (
          <g transform="rotate(-30 50 50) translate(22, 10)">
            {/* Left half */}
            <path d="M 16 0 L 28 0 L 28 32 L 16 32 A 16 16 0 0 1 16 0 Z" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="2.5" />
            {/* Right half */}
            <path d="M 28 0 L 40 0 A 16 16 0 0 1 40 32 L 28 32 Z" fill={`url(#grad_${color2 || 'white'})`} stroke={c2.stroke} strokeWidth="2.5" />
            {/* Center seam */}
            <line x1="28" y1="0" x2="28" y2="32" stroke="#475569" strokeWidth="2" opacity="0.6" />
            {/* Gloss shine */}
            <rect x="8" y="5" width="40" height="5" rx="2" fill="#ffffff" opacity="0.45" />
          </g>
        )}

        {/* 5. Square */}
        {shape === 'square' && (
          <g transform="translate(16, 16)">
            <rect x="0" y="0" width="68" height="68" rx="16" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            <line x1="12" y1="34" x2="56" y2="34" stroke={c1.stroke} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 12 18 L 56 18" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          </g>
        )}

        {/* 6. Diamond */}
        {shape === 'diamond' && (
          <g transform="translate(50, 50) rotate(45) translate(-32, -32)">
            <rect x="0" y="0" width="64" height="64" rx="12" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            <line x1="10" y1="32" x2="54" y2="32" stroke={c1.stroke} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* 7. Half Moon */}
        {shape === 'half_moon' && (
          <g transform="translate(20, 15)">
            <path d="M 10 60 A 35 35 0 0 1 65 15 A 32 32 0 0 0 10 60 Z" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            <path d="M 20 48 A 25 25 0 0 1 55 24" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.6" />
          </g>
        )}

        {/* 8. Heart */}
        {shape === 'heart' && (
          <g transform="translate(5, 5)">
            <path
              d="M 45 78 C 20 60 12 40 18 24 C 24 10 38 12 45 22 C 52 12 66 10 72 24 C 78 40 70 60 45 78 Z"
              fill={`url(#grad_${color})`}
              stroke={c1.stroke}
              strokeWidth="3"
            />
            <line x1="45" y1="28" x2="45" y2="62" stroke={c1.stroke} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* 9. Syrup Bottle */}
        {shape === 'syrup' && (
          <g transform="translate(18, 8)">
            {/* Cap */}
            <rect x="24" y="0" width="16" height="12" rx="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
            {/* Neck */}
            <rect x="27" y="12" width="10" height="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
            {/* Bottle Body */}
            <rect x="8" y="20" width="48" height="64" rx="10" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            {/* Label */}
            <rect x="14" y="38" width="36" height="32" rx="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="20" y1="46" x2="44" y2="46" stroke="#94a3b8" strokeWidth="2" />
            <line x1="20" y1="54" x2="38" y2="54" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="32" cy="62" r="3" fill={c1.stroke} />
          </g>
        )}

        {/* 10. Injection / Syringe */}
        {shape === 'injection' && (
          <g transform="rotate(45 50 50) translate(28, 5)">
            {/* Needle */}
            <line x1="22" y1="0" x2="22" y2="18" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            {/* Syringe barrel */}
            <rect x="12" y="18" width="20" height="52" rx="4" fill="#f1f5f9" stroke="#64748b" strokeWidth="2.5" />
            {/* Liquid inside */}
            <rect x="14" y="34" width="16" height="34" fill={`url(#grad_${color})`} opacity="0.85" />
            {/* Hash marks */}
            <line x1="12" y1="26" x2="18" y2="26" stroke="#475569" strokeWidth="1.5" />
            <line x1="12" y1="36" x2="18" y2="36" stroke="#475569" strokeWidth="1.5" />
            <line x1="12" y1="46" x2="18" y2="46" stroke="#475569" strokeWidth="1.5" />
            {/* Plunger */}
            <rect x="18" y="70" width="8" height="16" fill="#94a3b8" />
            <line x1="10" y1="86" x2="34" y2="86" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* 11. Inhaler */}
        {shape === 'inhaler' && (
          <g transform="translate(18, 12)">
            {/* Canister top */}
            <rect x="22" y="0" width="20" height="28" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
            {/* L-shaped body */}
            <path
              d="M 18 20 L 46 20 L 46 60 L 62 60 A 8 8 0 0 1 62 76 L 18 76 Z"
              fill={`url(#grad_${color})`}
              stroke={c1.stroke}
              strokeWidth="3"
            />
            {/* Mouthpiece opening */}
            <ellipse cx="62" cy="68" rx="3" ry="7" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          </g>
        )}

        {/* 12. Eye Drops */}
        {shape === 'eye_drops' && (
          <g transform="translate(20, 10)">
            {/* Tip */}
            <polygon points="30,0 24,16 36,16" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
            {/* Dropper Cap */}
            <rect x="22" y="16" width="16" height="14" rx="3" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
            {/* Bottle */}
            <rect x="10" y="30" width="40" height="48" rx="14" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            {/* Falling Droplet */}
            <path d="M 30 -6 C 26 -2 26 2 30 2 C 34 2 34 -2 30 -6 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
          </g>
        )}

        {/* 13. Ointment Tube */}
        {shape === 'ointment' && (
          <g transform="rotate(-35 50 50) translate(20, 15)">
            {/* Cap */}
            <rect x="26" y="0" width="12" height="12" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
            {/* Tube Body */}
            <path
              d="M 24 12 L 40 12 L 48 64 L 16 64 Z"
              fill={`url(#grad_${color})`}
              stroke={c1.stroke}
              strokeWidth="3"
            />
            {/* Folded crimp bottom */}
            <rect x="14" y="64" width="36" height="8" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
          </g>
        )}

        {/* 14. Powder Sachet */}
        {shape === 'powder_sachet' && (
          <g transform="translate(18, 12)">
            {/* Packet */}
            <rect x="4" y="8" width="56" height="66" rx="4" fill={`url(#grad_${color})`} stroke={c1.stroke} strokeWidth="3" />
            {/* Tear notch */}
            <polygon points="0,22 6,26 0,30" fill="#94a3b8" />
            {/* Center badge */}
            <circle cx="32" cy="40" r="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <text x="32" y="44" fontSize="12" fontWeight="bold" fill={c1.stroke} textAnchor="middle">Rx</text>
            {/* Powder sprinkles */}
            <circle cx="48" cy="62" r="1.5" fill="#ffffff" />
            <circle cx="52" cy="66" r="1.5" fill="#ffffff" />
            <circle cx="44" cy="68" r="1.5" fill="#ffffff" />
          </g>
        )}
      </svg>
    </div>
  );
};

