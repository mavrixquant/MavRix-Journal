// src/components/common/CustomCursor.jsx
import { useEffect, useRef } from 'react';

const CURSOR_CSS = `
  .auth-cur-dot, .auth-cur-ring {
    position: fixed;
    top: 0; left: 0;
    pointer-events: none;
    z-index: 9999;
    border-radius: 50%;
    will-change: transform;
  }
  .auth-cur-dot {
    width: 6px; height: 6px;
    background: #fff;
    margin: -3px 0 0 -3px;
  }
  .auth-cur-ring {
    width: 38px; height: 38px;
    margin: -19px 0 0 -19px;
    border: 1.5px solid rgba(255,255,255,.45);
    transition:
      width .28s cubic-bezier(.2,.8,.25,1),
      height .28s cubic-bezier(.2,.8,.25,1),
      margin .28s cubic-bezier(.2,.8,.25,1),
      border-color .28s,
      background .28s;
  }
  .auth-cur-ring.is-hot {
    width: 68px; height: 68px;
    margin: -34px 0 0 -34px;
    background: rgba(245,158,11,.10);
    border-color: #F59E0B;
  }
  @media (pointer: coarse) {
    .auth-cur-dot, .auth-cur-ring { display: none !important; }
  }
`;

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my, raf = 0;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      const t = e.target;
      const hot = t.closest('a, button, input, select, textarea, [role="button"]');
      if (ringRef.current) ringRef.current.classList.toggle('is-hot', !!hot);
    };

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx}px, ${my}px)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <style>{CURSOR_CSS}</style>
      <div ref={ringRef} className="auth-cur-ring" aria-hidden />
      <div ref={dotRef} className="auth-cur-dot" aria-hidden />
    </>
  );
}