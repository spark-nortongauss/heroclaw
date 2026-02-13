'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setSupported(false);
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(35,66,52,0.08)';
      for (let x = 0; x < w; x += 28) {
        ctx.fillRect(x, 0, 1, h);
      }
      for (let y = 0; y < h; y += 28) {
        ctx.fillRect(0, y, w, 1);
      }
      const pulse = 0.5 + Math.sin(frame * 0.04) * 0.5;
      const gradient = ctx.createRadialGradient(w * 0.25, h * 0.35, 10, w * 0.25, h * 0.35, 160 + 70 * pulse);
      gradient.addColorStop(0, 'rgba(217,255,53,0.35)');
      gradient.addColorStop(1, 'rgba(217,255,53,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      frame += 1;
    };

    resize();
    const id = window.setInterval(draw, media.matches ? 420 : 40);
    window.addEventListener('resize', resize);

    return () => {
      clearInterval(id);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (!supported) {
    return <div className="h-44 rounded-lg border bg-muted" />;
  }

  return <canvas ref={canvasRef} className="h-44 w-full rounded-lg border bg-white" aria-hidden />;
}
