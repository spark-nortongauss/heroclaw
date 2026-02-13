'use client';

import { useEffect, useRef } from 'react';

type LoginSceneProps = {
  reducedMotion: boolean;
};

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function LoginScene({ reducedMotion }: LoginSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points: Point[] = [];
    let raf = 0;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(28, Math.floor((rect.width * rect.height) / 25000));
      points.length = 0;

      for (let i = 0; i < count; i += 1) {
        points.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22
        });
      }
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.fillStyle = 'rgba(217,255,53,0.28)';
      ctx.strokeStyle = 'rgba(217,255,53,0.18)';

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];

        point.x += point.vx;
        point.y += point.vy;

        if (point.x < 0 || point.x > rect.width) point.vx *= -1;
        if (point.y < 0 || point.y > rect.height) point.vy *= -1;

        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < points.length; j += 1) {
          const neighbor = points[j];
          const dx = point.x - neighbor.x;
          const dy = point.y - neighbor.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.globalAlpha = (1 - distance / 120) * 0.65;
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      if (!reducedMotion) {
        raf = requestAnimationFrame(draw);
      }
    };

    setup();

    if (!reducedMotion) {
      draw();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const onResize = () => {
      setup();
      if (reducedMotion) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1] opacity-40" aria-hidden="true" />;
}
