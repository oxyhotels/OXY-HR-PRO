'use client';

import React, { useEffect, useRef } from 'react';

export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track particles
    const particleCount = 35;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      pulseSpeed: number;
      pulseOffset: number;
    }> = [];

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1, // 1px to 3px
        speedY: -(Math.random() * 0.4 + 0.1), // slowly rising
        speedX: Math.random() * 0.2 - 0.1, // drifting left/right
        opacity: Math.random() * 0.5 + 0.2, // 20% to 70% base opacity
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    let time = 0;
    const animate = () => {
      time += 0.002;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle ambient light rays/aurora glow in background of canvas
      const gradient = ctx.createRadialGradient(
        width * 0.85, height * 0.15, 10,
        width * 0.85, height * 0.15, Math.max(width, height) * 0.8
      );
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0.03)'); // subtle golden moonlight glow
      gradient.addColorStop(0.3, 'rgba(18, 60, 154, 0.02)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle light rays shifting slowly
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let r = 0; r < 3; r++) {
        const rayAngle = Math.sin(time + r * 1.5) * 0.08 - 0.5; // slow waving diagonal rays
        const rayWidth = width * 0.3;
        const rayStart = width * (0.6 + r * 0.1) + Math.cos(time) * 50;

        const rayGrad = ctx.createLinearGradient(rayStart, 0, rayStart + Math.sin(rayAngle) * height, height);
        rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.015)');
        rayGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.005)');
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(rayStart - rayWidth / 2, 0);
        ctx.lineTo(rayStart + rayWidth / 2, 0);
        ctx.lineTo(rayStart + Math.sin(rayAngle) * height + rayWidth / 2, height);
        ctx.lineTo(rayStart + Math.sin(rayAngle) * height - rayWidth / 2, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 2. Draw drifting particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;

        // Wrap around borders
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Pulse opacity over time
        const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(time * 1000 * p.pulseSpeed + p.pulseOffset));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Premium golden particle glow
        ctx.fillStyle = `rgba(212, 175, 55, ${currentOpacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
