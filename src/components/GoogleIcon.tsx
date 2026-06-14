'use client';

import React from 'react';

interface GoogleIconProps {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}

export default function GoogleIcon({ name, className = '', size, filled = false }: GoogleIconProps) {
  const style: React.CSSProperties = {};
  if (size) {
    style.fontSize = `${size}px`;
    style.width = `${size}px`;
    style.height = `${size}px`;
  }

  return (
    <span
      className={`material-symbols-outlined select-none transition-all ${className}`}
      style={{
        ...style,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
      }}
    >
      {name}
    </span>
  );
}
