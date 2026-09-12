// src/components/common/AuthBackground.jsx
import { useEffect, useRef } from 'react';

const hexToRgba = (hex, a = 1) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export default function AuthBackground({ accent = '#F59E0B' }) {
  const canvasRef = useRef(null);
  const accentRef = useRef(accent);
  useEffect(() => { accentRef.current = accent; }, [accent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = canvas.parentElement;
    let w = 0, h = 0, ctx = null, parts = [], mouse = { x: -9999, y: -9999 }, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let resizeObserver = null;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(30, Math.min(120, Math.floor(w / 16)));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - .5) * .28,
        vy: (Math.random() - .5) * .28,
        r: Math.random() * 1.6 + 0.9,
      }));
    };
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const tick = () => {
      if (!ctx) { raf = requestAnimationFrame(tick); return; }
      const ac = accentRef.current;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = hexToRgba(ac, .55);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 130 * 130) {
            ctx.strokeStyle = hexToRgba(ac, (1 - Math.sqrt(d2) / 130) * .12);
            ctx.lineWidth = .7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const a = parts[i];
        const dx = a.x - mouse.x, dy = a.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 180 * 180) {
          ctx.strokeStyle = hexToRgba(ac, (1 - Math.sqrt(d2) / 180) * .35);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    resize();
    tick();
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(wrap);
    } else {
      window.addEventListener('resize', resize);
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-particles" aria-hidden />;
}