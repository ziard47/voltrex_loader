import React from 'react';
import logoImg from '../assets/logo.jpg';

export default function Logo({ size = 32, className = '' }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-xl overflow-hidden border border-[#D84040]/40 flex items-center justify-center shrink-0 bg-[#1D1616] ${className}`}
    >
      <img
        src={logoImg}
        alt="Voltrex Loader Logo"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback SVG if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
