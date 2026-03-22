'use client';

import { useEffect, useRef } from 'react';

export default function WaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let t = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    // Wave parameters: each wave has amplitude, frequency, speed, phase, y-offset ratio
    const waves = [
      { amp: 80, freq: 0.003, speed: 0.008, phase: 0, yRatio: 0.45, opacity: 0.15 },
      { amp: 60, freq: 0.004, speed: 0.012, phase: 1.2, yRatio: 0.50, opacity: 0.12 },
      { amp: 100, freq: 0.002, speed: 0.006, phase: 2.5, yRatio: 0.55, opacity: 0.10 },
      { amp: 40, freq: 0.005, speed: 0.015, phase: 0.8, yRatio: 0.42, opacity: 0.08 },
    ];

    const draw = () => {
      const W = w();
      const H = h();
      ctx.clearRect(0, 0, W, H);

      // Background gradient (top-left purple → top-right cyan → bottom white)
      const isDark = document.documentElement.classList.contains('dark');
      const bgGrad = ctx.createLinearGradient(0, 0, W, H * 0.6);
      if (isDark) {
        bgGrad.addColorStop(0, '#1a0a2e');
        bgGrad.addColorStop(0.4, '#0d1b3e');
        bgGrad.addColorStop(0.7, '#0a2a35');
        bgGrad.addColorStop(1, '#080A11');
      } else {
        bgGrad.addColorStop(0, '#c850c0');
        bgGrad.addColorStop(0.35, '#7b6cf6');
        bgGrad.addColorStop(0.65, '#4facfe');
        bgGrad.addColorStop(1, '#89f7fe');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Fade-to-background at bottom
      const fadeGrad = ctx.createLinearGradient(0, H * 0.4, 0, H);
      if (isDark) {
        fadeGrad.addColorStop(0, 'rgba(8, 10, 17, 0)');
        fadeGrad.addColorStop(0.6, 'rgba(8, 10, 17, 0.7)');
        fadeGrad.addColorStop(1, 'rgba(8, 10, 17, 1)');
      } else {
        fadeGrad.addColorStop(0, 'rgba(232, 234, 240, 0)');
        fadeGrad.addColorStop(0.6, 'rgba(232, 234, 240, 0.7)');
        fadeGrad.addColorStop(1, 'rgba(232, 234, 240, 1)');
      }
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, 0, W, H);

      // Draw animated waves
      for (const wave of waves) {
        const baseY = H * wave.yRatio;
        ctx.beginPath();
        ctx.moveTo(0, H);

        for (let x = 0; x <= W; x += 2) {
          const y = baseY
            + Math.sin(x * wave.freq + t * wave.speed + wave.phase) * wave.amp
            + Math.sin(x * wave.freq * 0.5 + t * wave.speed * 1.3 + wave.phase * 0.7) * wave.amp * 0.5;
          if (x === 0) ctx.lineTo(0, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();

        // Wave fill with gradient
        const waveGrad = ctx.createLinearGradient(0, baseY - wave.amp, W, baseY + wave.amp);
        if (isDark) {
          waveGrad.addColorStop(0, `rgba(92, 229, 160, ${wave.opacity * 0.6})`);
          waveGrad.addColorStop(0.5, `rgba(86, 205, 231, ${wave.opacity * 0.5})`);
          waveGrad.addColorStop(1, `rgba(77, 101, 255, ${wave.opacity * 0.4})`);
        } else {
          waveGrad.addColorStop(0, `rgba(200, 80, 192, ${wave.opacity})`);
          waveGrad.addColorStop(0.5, `rgba(79, 172, 254, ${wave.opacity})`);
          waveGrad.addColorStop(1, `rgba(137, 247, 254, ${wave.opacity})`);
        }
        ctx.fillStyle = waveGrad;
        ctx.fill();
      }

      t += 1;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    />
  );
}
